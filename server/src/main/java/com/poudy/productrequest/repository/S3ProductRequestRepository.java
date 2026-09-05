package com.poudy.productrequest.repository;

import com.poudy.exception.InfrastructureException;
import com.poudy.productrequest.domain.ProductRequest;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Repository
public class S3ProductRequestRepository {

    private final S3Client s3Client;
    private final ObjectMapper objectMapper;
    private final String bucket;
    private final String prefix;

    public S3ProductRequestRepository(
        @Qualifier("productRequestS3Client") S3Client s3Client,
        ObjectMapper objectMapper,
        @Value("${poudy.product-request.s3.bucket:}") String bucket,
        @Value("${poudy.product-request.s3.prefix:product-requests}") String prefix
    ) {
        this.s3Client = s3Client;
        this.objectMapper = objectMapper;
        this.bucket = bucket.trim();
        this.prefix = normalizePrefix(prefix);
    }

    public void save(ProductRequest request) {
        if (!StringUtils.hasText(bucket)) {
            throw new InfrastructureException("제품 등록 요청 S3 버킷이 설정되지 않았습니다.");
        }

        byte[] body = serialize(request);
        PutObjectRequest put = PutObjectRequest.builder()
            .bucket(bucket)
            .key(objectKey(request))
            .contentType("application/json")
            .contentLength((long) body.length)
            .build();

        try {
            s3Client.putObject(put, RequestBody.fromBytes(body));
        } catch (SdkException exception) {
            throw new InfrastructureException("제품 등록 요청을 S3에 저장하지 못했습니다.", exception);
        }
    }

    String objectKey(ProductRequest request) {
        String relative = request.requestId() + ".json";
        if (prefix.isEmpty()) {
            return relative;
        }

        return prefix + "/" + relative;
    }

    private byte[] serialize(ProductRequest request) {
        try {
            return objectMapper.writeValueAsString(ProductRequestDocument.from(request))
                .getBytes(StandardCharsets.UTF_8);
        } catch (JacksonException exception) {
            throw new InfrastructureException("제품 등록 요청 JSON을 만들지 못했습니다.", exception);
        }
    }

    private static String normalizePrefix(String prefix) {
        if (prefix == null) {
            return "";
        }

        return prefix.trim().replaceAll("^/+|/+$", "");
    }

    private record ProductRequestDocument(
        int schemaVersion,
        java.util.UUID requestId,
        String productName,
        String brandName,
        java.time.OffsetDateTime requestedAt) {

        private static ProductRequestDocument from(ProductRequest request) {
            return new ProductRequestDocument(
                request.schemaVersion(),
                request.requestId(),
                request.productName(),
                request.brandName(),
                request.requestedAt()
            );
        }
    }
}
