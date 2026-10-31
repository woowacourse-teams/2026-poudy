package com.poudy.inquiry.service;

import com.poudy.feedback.domain.FeedbackStatus;
import com.poudy.image.domain.ImageContent;
import com.poudy.inquiry.domain.InquiryItem;
import com.poudy.inquiry.domain.InquiryKind;
import com.poudy.inquiry.domain.InquiryQuery;
import com.poudy.inquiry.repository.InquiryRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InquiryService {
    private final InquiryRepository repository;
    private final com.poudy.feedback.service.FeedbackService feedbacks;
    public InquiryService(
        InquiryRepository repository,
        com.poudy.feedback.service.FeedbackService feedbacks
    ) {
        this.feedbacks = feedbacks;
        this.repository = repository;
    }

    public ImageDownload image(InquiryKind kind, UUID id, UUID imageId) {
        repository.detail(kind, id);
        if (!kind.hasImages()) {
            throw new com.poudy.exception.ResourceNotFoundException(com.poudy.exception.ErrorCode.FEEDBACK_NOT_FOUND);
        }
        ImageContent content = feedbacks.readImage(id, imageId);
        return new ImageDownload(content.bytes(), content.contentType());
    }
    public record ImageDownload(byte[] bytes, String contentType) {
    }

    public List<InquiryItem> find(InquiryQuery query, long offset, int size) {
        return repository.find(query, offset, size);
    }

    public com.poudy.inquiry.domain.InquiryNavigation neighbors(InquiryQuery query, InquiryKind kind, UUID id) {
        return repository.neighbors(query, kind, id);
    }

    public long count(InquiryQuery query) {
        return repository.count(query);
    }

    public Map<String, Long> summary() {
        return repository.summary();
    }

    public InquiryItem detail(InquiryKind kind, UUID id) {
        return repository.detail(kind, id);
    }

    @Transactional
    public void status(List<Target> targets, FeedbackStatus status) {
        for (Target t : ordered(targets)) {
            repository.lock(t.kind(), t.id());
            repository.status(t.kind(), t.id(), status);
        }
    }

    @Transactional
    public void assign(List<Target> targets, boolean assigned) {
        for (Target t : ordered(targets)) {
            repository.lock(t.kind(), t.id());
            repository.assign(t.kind(), t.id(), assigned);
        }
    }

    private static List<Target> ordered(List<Target> targets) {
        return targets.stream().distinct()
            .sorted(Comparator.comparing((Target t) -> t.kind().name()).thenComparing(Target::id)).toList();
    }
    public record Target(InquiryKind kind, UUID id) {
    }
}
