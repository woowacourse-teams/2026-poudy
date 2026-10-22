package com.poudy.notice.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.exception.TooManyRequestsException;
import com.poudy.feedback.image.FeedbackImageProcessor;
import com.poudy.feedback.ratelimit.FeedbackRateLimits;
import com.poudy.notice.domain.Notice;
import com.poudy.notice.domain.NoticeConflictException;
import com.poudy.notice.domain.NoticeImage;
import com.poudy.notice.domain.NoticeStatus;
import com.poudy.notice.repository.NoticeImageRepository;
import com.poudy.notice.repository.NoticeRepository;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Semaphore;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class NoticeService {
    private final NoticeRepository notices;
    private final NoticeImageRepository images;
    private final FeedbackImageProcessor processor;
    private final FeedbackRateLimits limits;
    private final Clock clock;
    private final Semaphore permit = new Semaphore(1);
    public NoticeService(
        NoticeRepository notices,
        NoticeImageRepository images,
        FeedbackImageProcessor processor,
        FeedbackRateLimits limits,
        Clock clock
    ) {
        this.notices = notices;
        this.images = images;
        this.processor = processor;
        this.limits = limits;
        this.clock = clock;
    }

    public List<Notice> list(String q, NoticeStatus status, long offset, int size) {
        return notices.list(q, status, offset, size, false);
    }

    public List<Notice> adminList(String q, NoticeStatus status, long offset, int size, boolean oldest) {
        return notices.adminList(q, status, offset, size, oldest);
    }

    public long count(String q, NoticeStatus status) {
        return notices.count(q, status);
    }

    public long bannerCount() {
        return notices.bannerCount();
    }

    public List<Notice> banners() {
        return notices.list("", NoticeStatus.PUBLISHED, 0, 10, true);
    }

    public Notice find(UUID id, boolean published) {
        var n = notices.find(id, false);
        if (published && !n.isPublished()) {
            throw new ResourceNotFoundException(ErrorCode.NOTICE_NOT_FOUND);
        }
        return n;
    }

    @Transactional
    public Notice save(
        UUID id,
        String title,
        String content,
        NoticeStatus status,
        boolean enabled,
        String text,
        List<UUID> ids
    ) {
        Notice n = id == null ? Notice.create(title, content, status, enabled, text, clock)
            : notices.find(id, true).edit(title, content, status, enabled, text, clock);
        if (id == null) {
            notices.create(n);
        } else {
            notices.update(n);
        }
        images.attach(n.id(), ids);
        return n;
    }

    @Transactional
    public void delete(UUID id) {
        var n = notices.find(id, true);
        if (n.isPublished()) {
            throw new NoticeConflictException();
        }
        notices.delete(id);
    }

    public void view(UUID id) {
        notices.view(id);
    }

    public List<NoticeImage> images(UUID id) {
        return images.images(id);
    }

    public NoticeImage image(UUID id) {
        return images.image(id);
    }

    public NoticeImage publicImage(UUID notice, UUID id) {
        find(notice, true);
        return images.images(notice).stream().filter(i -> i.id().equals(id)).findFirst()
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOTICE_NOT_FOUND));
    }

    public byte[] bytes(NoticeImage image) {
        return images.read(image);
    }

    public List<UUID> upload(List<MultipartFile> files, String client) {
        processor.validateBatch(files);
        limits.requireImageUploadAllowed("notice:" + client);
        if (!permit.tryAcquire()) {
            throw new TooManyRequestsException(java.time.Duration.ofSeconds(1));
        }
        try {
            return files.stream().map(f -> images.upload(processor.process(f))).toList();
        } finally {
            permit.release();
        }
    }
}
