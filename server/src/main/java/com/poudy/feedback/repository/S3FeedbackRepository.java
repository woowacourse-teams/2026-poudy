package com.poudy.feedback.repository;

import com.poudy.exception.InfrastructureException;
import com.poudy.feedback.domain.Feedback;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Repository
public class S3FeedbackRepository {

    private static final String KEY_PREFIX = "poudy/feedback/";
    private static final String CONTENT_TYPE = "application/json; charset=" + StandardCharsets.UTF_8.name();

    private final S3Client s3Client;
    private final ObjectMapper objectMapper;
    private final String bucket;

    public S3FeedbackRepository(
            S3Client s3Client,
            ObjectMapper objectMapper,
            @Value("${poudy.feedback.s3.bucket:}") String bucket) {
        this.s3Client = s3Client;
        this.objectMapper = objectMapper;
        this.bucket = bucket;
    }

    public void save(Feedback feedback) {
        try {
            byte[] body = objectMapper.writeValueAsBytes(documentOf(feedback));
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(keyOf(feedback))
                    .contentType(CONTENT_TYPE)
                    .build();

            s3Client.putObject(request, RequestBody.fromBytes(body));
        } catch (JacksonException | SdkException exception) {
            throw new InfrastructureException("의견 원본을 S3에 저장하지 못했습니다.", exception);
        }
    }

    private static String keyOf(Feedback feedback) {
        return KEY_PREFIX + feedback.id() + ".json";
    }

    private static Map<String, String> documentOf(Feedback feedback) {
        Map<String, String> document = new LinkedHashMap<>();
        document.put("feedbackId", feedback.id().toString());
        document.put("type", feedback.type().name());
        document.put("content", feedback.content().value());
        document.put("path", feedback.path().value());
        document.put("receivedAt", feedback.receivedAt().toString());

        return document;
    }
}
