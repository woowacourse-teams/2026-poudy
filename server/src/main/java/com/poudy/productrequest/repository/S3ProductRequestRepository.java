package com.poudy.productrequest.repository;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InfrastructureException;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.productrequest.domain.ProductRequest;
import com.poudy.productrequest.domain.ProductRequestStatus;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.model.S3Object;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Repository
public class S3ProductRequestRepository {

    private static final String CONTENT_TYPE = "application/json";
    private static final int INITIAL_SCHEMA_VERSION = 1;
    private static final int MANAGEMENT_SCHEMA_VERSION = 2;

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
        requireBucket();
        put(request, INITIAL_SCHEMA_VERSION, "제품 등록 요청을 S3에 저장하지 못했습니다.");
    }

    public ProductRequest findById(UUID requestId) {
        requireBucket();
        try {
            return read(objectKey(requestId));
        } catch (S3Exception exception) {
            if (exception.statusCode() == 404) {
                throw new ResourceNotFoundException(ErrorCode.PRODUCT_REQUEST_NOT_FOUND);
            }
            throw new InfrastructureException("제품 등록 요청을 S3에서 읽지 못했습니다.", exception);
        } catch (SdkException exception) {
            throw new InfrastructureException("제품 등록 요청을 S3에서 읽지 못했습니다.", exception);
        }
    }

    public List<ProductRequest> findAll(ProductRequestStatus status) {
        requireBucket();
        try {
            return listObjectKeys().stream()
                .map(this::read)
                .filter(request -> status == null || request.hasStatus(status))
                .sorted(
                    Comparator.comparing(ProductRequest::requestedAt).reversed()
                        .thenComparing(ProductRequest::requestId, Comparator.reverseOrder())
                )
                .toList();
        } catch (SdkException exception) {
            throw new InfrastructureException("제품 등록 요청 목록을 S3에서 읽지 못했습니다.", exception);
        }
    }

    public void update(ProductRequest request) {
        requireBucket();
        put(request, MANAGEMENT_SCHEMA_VERSION, "제품 등록 요청 상태를 S3에 저장하지 못했습니다.");
    }

    String objectKey(ProductRequest request) {
        return objectKey(request.requestId());
    }

    private void put(ProductRequest request, int schemaVersion, String failureMessage) {
        byte[] body = serialize(request, schemaVersion);
        PutObjectRequest put = PutObjectRequest.builder()
            .bucket(bucket)
            .key(objectKey(request))
            .contentType(CONTENT_TYPE)
            .contentLength((long) body.length)
            .build();
        try {
            s3Client.putObject(put, RequestBody.fromBytes(body));
        } catch (SdkException exception) {
            throw new InfrastructureException(failureMessage, exception);
        }
    }

    private String objectKey(UUID requestId) {
        String relative = requestId + ".json";
        if (prefix.isEmpty()) {
            return relative;
        }
        return prefix + "/" + relative;
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
        return deserialize(body);
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

    private ProductRequest deserialize(byte[] body) {
        try {
            return objectMapper.readValue(body, ProductRequestDocument.class).toDomain();
        } catch (JacksonException | IllegalArgumentException | NullPointerException exception) {
            throw new InfrastructureException("제품 등록 요청 JSON을 읽지 못했습니다.", exception);
        }
    }

    private byte[] serialize(ProductRequest request, int schemaVersion) {
        try {
            return objectMapper.writeValueAsString(documentOf(request, schemaVersion)).getBytes(StandardCharsets.UTF_8);
        } catch (JacksonException exception) {
            throw new InfrastructureException("제품 등록 요청 JSON을 만들지 못했습니다.", exception);
        }
    }

    private static Map<String, Object> documentOf(ProductRequest request, int schemaVersion) {
        Map<String, Object> document = new LinkedHashMap<>();
        document.put("schemaVersion", schemaVersion);
        document.put("requestId", request.requestId());
        document.put("productName", request.productName());
        document.put("brandName", request.brandName());
        document.put("requestedAt", request.requestedAt());
        if (schemaVersion >= MANAGEMENT_SCHEMA_VERSION) {
            document.put("status", request.status());
            document.put("statusChangedAt", request.statusChangedAt());
            document.put("completedAt", request.completedAt());
        }
        return document;
    }

    private void requireBucket() {
        if (!StringUtils.hasText(bucket)) {
            throw new InfrastructureException("제품 등록 요청 S3 버킷이 설정되지 않았습니다.");
        }
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
            if (schemaVersion != null && schemaVersion == INITIAL_SCHEMA_VERSION) {
                return new ProductRequest(requestId, productName, brandName, requestedAt);
            }
            if (schemaVersion == null || schemaVersion != MANAGEMENT_SCHEMA_VERSION) {
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
