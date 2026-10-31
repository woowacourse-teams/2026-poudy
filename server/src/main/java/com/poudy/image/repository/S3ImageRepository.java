package com.poudy.image.repository;

import com.poudy.exception.InfrastructureException;
import com.poudy.image.domain.ImageContent;
import com.poudy.image.domain.ImagePurpose;
import com.poudy.image.domain.ProcessedImage;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.ServerSideEncryption;

@Repository
public class S3ImageRepository {

    private final S3Client s3Client;
    private final String bucket;
    private final String feedbackPrefix;

    public S3ImageRepository(
        S3Client s3Client,
        @Value("${poudy.image.s3.bucket:}") String bucket,
        @Value("${poudy.image.s3.feedback-prefix:poudy/feedback/images/}") String feedbackPrefix
    ) {
        if (feedbackPrefix.isBlank() || !feedbackPrefix.endsWith("/")) {
            throw new IllegalArgumentException("이미지 경로는 비어 있지 않고 /로 끝나야 합니다.");
        }
        this.s3Client = s3Client;
        this.bucket = bucket;
        this.feedbackPrefix = feedbackPrefix;
    }

    public void save(UUID id, ImagePurpose purpose, ProcessedImage image) {
        try {
            s3Client.putObject(
                PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(keyOf(id, purpose))
                    .contentType(image.format().contentType())
                    .serverSideEncryption(ServerSideEncryption.AES256)
                    .ifNoneMatch("*")
                    .build(),
                RequestBody.fromBytes(image.bytes())
            );
        } catch (SdkException exception) {
            throw infrastructure();
        }
    }

    public Optional<ImageContent> read(UUID id, ImagePurpose purpose) {
        try {
            ResponseBytes<GetObjectResponse> object = s3Client.getObjectAsBytes(
                GetObjectRequest.builder().bucket(bucket).key(keyOf(id, purpose)).build()
            );
            return Optional.of(new ImageContent(object.asByteArray(), object.response().contentType()));
        } catch (NoSuchKeyException exception) {
            return Optional.empty();
        } catch (SdkException exception) {
            throw infrastructure();
        }
    }

    public void delete(UUID id, ImagePurpose purpose) {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(keyOf(id, purpose)).build());
        } catch (SdkException exception) {
            throw infrastructure();
        }
    }

    private String keyOf(UUID id, ImagePurpose purpose) {
        return switch (purpose) {
            case FEEDBACK -> feedbackPrefix + id;
        };
    }

    private static InfrastructureException infrastructure() {
        return new InfrastructureException("이미지 저장소를 처리하지 못했습니다.");
    }
}
