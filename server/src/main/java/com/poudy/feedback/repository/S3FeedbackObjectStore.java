package com.poudy.feedback.repository;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CopyObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.model.S3Object;
import software.amazon.awssdk.services.s3.model.ServerSideEncryption;

@Component
public class S3FeedbackObjectStore {

    private final S3Client s3Client;
    private final String bucket;

    public S3FeedbackObjectStore(
            @Qualifier("feedbackS3Client") S3Client s3Client,
            @Value("${poudy.feedback.s3.bucket:}") String bucket) {
        this.s3Client = s3Client;
        this.bucket = bucket;
    }

    void putIfAbsent(String key, String contentType, byte[] body) {
        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(contentType)
                    .serverSideEncryption(ServerSideEncryption.AES256)
                    .ifNoneMatch("*")
                    .build();
            s3Client.putObject(request, RequestBody.fromBytes(body));
        } catch (SdkException exception) {
            throw failure(exception);
        }
    }

    Optional<ObjectMetadata> head(String key) {
        try {
            HeadObjectResponse response = s3Client.headObject(
                    HeadObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .build());
            return Optional.of(new ObjectMetadata(response.eTag(), response.lastModified()));
        } catch (S3Exception exception) {
            if (exception.statusCode() == 404) {
                return Optional.empty();
            }
            throw failure(exception);
        } catch (SdkException exception) {
            throw failure(exception);
        }
    }

    byte[] read(String key) {
        try {
            return s3Client.getObjectAsBytes(
                    GetObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .build())
                    .asByteArray();
        } catch (SdkException exception) {
            throw failure(exception);
        }
    }

    boolean matchesSha256(String key, String expectedSha256) {
        return expectedSha256.equals(sha256(read(key)));
    }

    boolean existsExactly(String key) {
        try {
            ListObjectsV2Response response = s3Client.listObjectsV2(
                    ListObjectsV2Request.builder()
                            .bucket(bucket)
                            .prefix(key)
                            .maxKeys(1)
                            .build());
            return response.contents().stream().anyMatch(object -> key.equals(object.key()));
        } catch (SdkException exception) {
            throw failure(exception);
        }
    }

    List<StoredObject> listAll(String prefix) {
        List<StoredObject> objects = new ArrayList<>();
        String continuationToken = null;
        try {
            do {
                ListObjectsV2Response response = s3Client.listObjectsV2(
                        ListObjectsV2Request.builder()
                                .bucket(bucket)
                                .prefix(prefix)
                                .continuationToken(continuationToken)
                                .build());
                response.contents().stream()
                        .map(S3FeedbackObjectStore::storedObjectOf)
                        .forEach(objects::add);
                continuationToken = response.nextContinuationToken();
            } while (continuationToken != null);
            return List.copyOf(objects);
        } catch (SdkException exception) {
            throw failure(exception);
        }
    }

    void copyIfAbsent(
            String sourceKey,
            String sourceETag,
            String targetKey,
            String contentType) {
        try {
            s3Client.copyObject(
                    CopyObjectRequest.builder()
                            .bucket(bucket)
                            .key(targetKey)
                            .copySource(encode(bucket + "/" + sourceKey))
                            .copySourceIfMatch(sourceETag)
                            .ifNoneMatch("*")
                            .contentType(contentType)
                            .serverSideEncryption(ServerSideEncryption.AES256)
                            .build());
        } catch (SdkException exception) {
            throw failure(exception);
        }
    }

    void delete(String key) {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
        } catch (SdkException exception) {
            throw failure(exception);
        }
    }

    private static StoredObject storedObjectOf(S3Object object) {
        return new StoredObject(object.key(), object.lastModified());
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8)
                .replace("+", "%20")
                .replace("%2F", "/");
    }

    static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", exception);
        }
    }

    private static ObjectStoreException failure(SdkException exception) {
        FailureKind kind = FailureKind.RETRYABLE;
        if (exception instanceof S3Exception s3Exception) {
            kind = switch (s3Exception.statusCode()) {
                case 404 -> FailureKind.NOT_FOUND;
                case 409 -> FailureKind.CONFLICT;
                case 412 -> FailureKind.PRECONDITION_FAILED;
                default -> {
                    if (s3Exception.statusCode() >= 500) {
                        yield FailureKind.RETRYABLE;
                    }

                    yield FailureKind.OTHER;
                }
            };
        }
        return new ObjectStoreException(kind, exception);
    }

    enum FailureKind {
        NOT_FOUND,
        CONFLICT,
        PRECONDITION_FAILED,
        RETRYABLE,
        OTHER
    }

    static final class ObjectStoreException extends RuntimeException {

        private final FailureKind kind;

        private ObjectStoreException(FailureKind kind, SdkException cause) {
            super(cause);
            this.kind = kind;
        }

        FailureKind kind() {
            return kind;
        }
    }

    record ObjectMetadata(String eTag, Instant lastModified) {
    }

    record StoredObject(String key, Instant lastModified) {
    }
}
