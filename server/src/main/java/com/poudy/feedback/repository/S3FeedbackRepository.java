package com.poudy.feedback.repository;

import com.poudy.exception.InfrastructureException;
import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.repository.S3FeedbackObjectStore.ObjectStoreException;
import java.nio.charset.StandardCharsets;
import java.time.InstantSource;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Repository
public class S3FeedbackRepository {

    private static final Logger log = LoggerFactory.getLogger(S3FeedbackRepository.class);
    private static final String KEY_PREFIX = "poudy/feedback/";
    private static final String CONTENT_TYPE = "application/json; charset=" + StandardCharsets.UTF_8.name();

    private final S3FeedbackObjectStore objectStore;
    private final S3FeedbackImageRepository imageRepository;
    private final ObjectMapper objectMapper;

    public S3FeedbackRepository(
        S3FeedbackObjectStore objectStore,
        S3FeedbackImageRepository imageRepository,
        ObjectMapper objectMapper
    ) {
        this.objectStore = objectStore;
        this.imageRepository = imageRepository;
        this.objectMapper = objectMapper;
    }

    PreparedDocument prepare(Feedback feedback) {
        try {
            byte[] body = objectMapper.writeValueAsBytes(documentOf(feedback));
            return new PreparedDocument(body);
        } catch (JacksonException exception) {
            throw new InfrastructureException("의견 원본을 직렬화하지 못했습니다.");
        }
    }

    SaveStatus save(Feedback feedback, PreparedDocument document) {
        try {
            objectStore.putIfAbsent(keyOf(feedback), CONTENT_TYPE, document.bytes());
            return SaveStatus.SUCCESS;
        } catch (ObjectStoreException exception) {
            return verifyCommit(feedback);
        }
    }

    private SaveStatus verifyCommit(Feedback feedback) {
        String key = keyOf(feedback);
        try {
            return objectStore.existsExactly(key) ? SaveStatus.SUCCESS : SaveStatus.FAILURE;
        } catch (ObjectStoreException exception) {
            return SaveStatus.UNKNOWN;
        }
    }

    public void save(Feedback feedback) {
        PreparedDocument document = prepare(feedback);
        if (save(feedback, document) != SaveStatus.SUCCESS) {
            throw new InfrastructureException("의견 원본을 S3에 저장하지 못했습니다.");
        }
    }

    public Feedback save(
        Feedback feedback,
        List<UUID> imageIds,
        InstantSource timeSource
    ) {
        if (imageIds.isEmpty()) {
            save(feedback);
            return feedback;
        }

        List<S3FeedbackImageRepository.PendingImage> pending = imageRepository.resolve(imageIds, timeSource.instant());
        Feedback attached = feedback
            .attachImages(pending.stream().map(S3FeedbackImageRepository.PendingImage::image).toList());
        PreparedDocument document = prepare(attached);
        S3FeedbackImageRepository.Claim claim = imageRepository.claimAndCopy(
            attached.id(),
            pending,
            timeSource
        );
        SaveStatus status = save(attached, document);
        if (status == SaveStatus.FAILURE) {
            imageRepository.rollback(claim);
            throw new InfrastructureException("의견 원본을 S3에 저장하지 못했습니다.");
        }
        if (status == SaveStatus.UNKNOWN) {
            throw new InfrastructureException("의견 저장 결과를 확인하지 못했습니다.");
        }
        if (!imageRepository.commit(claim)) {
            log.error(
                "의견 이미지 commit 정리를 완료하지 못했습니다. feedbackId={}, imageCount={}",
                attached.id(),
                attached.images().size()
            );
        }
        return attached;
    }

    private static String keyOf(Feedback feedback) {
        return KEY_PREFIX + feedback.id() + "/feedback.json";
    }

    private static Map<String, Object> documentOf(Feedback feedback) {
        Map<String, Object> document = new LinkedHashMap<>();
        document.put("feedbackId", feedback.id().toString());
        document.put("type", feedback.type().name());
        document.put("content", feedback.content().value());
        document.put("path", feedback.path().value());
        document.put("receivedAt", feedback.receivedAt().toString());

        List<Map<String, String>> images = new ArrayList<>();
        feedback.images().forEach(image -> {
            Map<String, String> item = new LinkedHashMap<>();
            item.put("imageId", image.id().toString());
            item.put("extension", image.format().extension());
            images.add(item);
        });
        document.put("images", images);

        return document;
    }

    enum SaveStatus {
        SUCCESS,
        FAILURE,
        UNKNOWN
    }

    record PreparedDocument(byte[] bytes) {

        PreparedDocument {
            bytes = bytes.clone();
        }

        @Override
        public byte[] bytes() {
            return bytes.clone();
        }
    }
}
