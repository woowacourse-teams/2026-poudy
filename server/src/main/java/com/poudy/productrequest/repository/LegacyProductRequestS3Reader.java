package com.poudy.productrequest.repository;

import com.poudy.exception.InfrastructureException;
import com.poudy.productrequest.domain.ProductRequest;
import com.poudy.productrequest.domain.ProductRequestStatus;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.S3Object;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Component
@ConditionalOnProperty(name = "poudy.legacy-s3-migration.enabled", havingValue = "true")
public class LegacyProductRequestS3Reader {

    private final S3Client s3Client;
    private final ObjectMapper objectMapper;
    private final String bucket;
    private final String prefix;

    public LegacyProductRequestS3Reader(
        @Qualifier("legacyProductRequestS3Client") S3Client s3Client,
        ObjectMapper objectMapper,
        @Value("${poudy.product-request.legacy-s3.bucket}") String bucket,
        @Value("${poudy.product-request.legacy-s3.prefix:product-requests}") String prefix
    ) {
        this.s3Client = s3Client;
        this.objectMapper = objectMapper;
        this.bucket = bucket.trim();
        this.prefix = normalizePrefix(prefix);
        if (!StringUtils.hasText(this.bucket)) {
            throw new InfrastructureException("기존 제품 등록 요청 S3 버킷이 설정되지 않았습니다.");
        }
    }

    public List<ProductRequest> findAll() {
        try {
            return listObjectKeys().stream().map(this::read).toList();
        } catch (SdkException exception) {
            throw new InfrastructureException("기존 제품 등록 요청 목록을 S3에서 읽지 못했습니다.", exception);
        }
    }

    private List<String> listObjectKeys() {
        List<String> keys = new ArrayList<>();
        String continuationToken = null;
        do {
            ListObjectsV2Response response = s3Client.listObjectsV2(
                ListObjectsV2Request.builder()
                    .bucket(bucket)
                    .prefix(listPrefix())
                    .continuationToken(continuationToken)
                    .build()
            );
            response.contents().stream()
                .map(S3Object::key)
                .filter(this::isRequestDocumentKey)
                .forEach(keys::add);
            continuationToken = response.nextContinuationToken();
        } while (continuationToken != null);
        return List.copyOf(keys);
    }

    private ProductRequest read(String key) {
        byte[] body = s3Client.getObjectAsBytes(
            GetObjectRequest.builder().bucket(bucket).key(key).build()
        ).asByteArray();
        try {
            return objectMapper.readValue(body, ProductRequestDocument.class).toDomain();
        } catch (JacksonException | IllegalArgumentException | NullPointerException exception) {
            throw new InfrastructureException("기존 제품 등록 요청 JSON을 읽지 못했습니다.", exception);
        }
    }

    private boolean isRequestDocumentKey(String key) {
        if (!key.startsWith(listPrefix()) || !key.endsWith(".json")) {
            return false;
        }
        String filename = key.substring(listPrefix().length(), key.length() - ".json".length());
        try {
            UUID.fromString(filename);
            return true;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private String listPrefix() {
        return prefix.isEmpty() ? "" : prefix + "/";
    }

    private static String normalizePrefix(String prefix) {
        if (prefix == null) {
            return "";
        }
        return prefix.trim().replaceAll("^/+|/+$", "");
    }

    private record ProductRequestDocument(
        Integer schemaVersion,
        UUID requestId,
        String productName,
        String brandName,
        OffsetDateTime requestedAt,
        ProductRequestStatus status,
        OffsetDateTime statusChangedAt,
        OffsetDateTime completedAt) {

        private ProductRequest toDomain() {
            if (schemaVersion != null && schemaVersion == 1) {
                return new ProductRequest(requestId, productName, brandName, requestedAt);
            }
            if (schemaVersion == null || schemaVersion != 2) {
                throw new IllegalArgumentException("지원하지 않는 제품 등록 요청 스키마입니다.");
            }
            return new ProductRequest(
                requestId,
                productName,
                brandName,
                requestedAt,
                status,
                statusChangedAt,
                completedAt
            );
        }
    }
}
