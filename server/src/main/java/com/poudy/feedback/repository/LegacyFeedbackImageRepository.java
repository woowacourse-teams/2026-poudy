package com.poudy.feedback.repository;

import com.poudy.exception.InfrastructureException;
import com.poudy.feedback.domain.LegacyFeedbackImage;
import com.poudy.feedback.domain.LegacyFeedbackImages;
import com.poudy.image.domain.ImageContent;
import com.poudy.image.domain.ImageFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CommonPrefix;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.S3Object;

@Repository
public class LegacyFeedbackImageRepository {

    private static final String FEEDBACK_PREFIX = "poudy/feedback/";
    private static final String IMAGES_FOLDER = "images/";

    private final S3Client s3Client;
    private final String bucket;
    private final String pendingPrefix;

    public LegacyFeedbackImageRepository(
        S3Client s3Client,
        @Value("${poudy.image.s3.bucket:}") String bucket,
        @Value("${poudy.feedback.image-s3.pending-prefix}") String pendingPrefix
    ) {
        this.s3Client = s3Client;
        this.bucket = bucket;
        this.pendingPrefix = pendingPrefix;
    }

    public LegacyFeedbackImages findAll() {
        Stream<LegacyFeedbackImage> stored = feedbackFolders().stream()
            .flatMap(feedbackId -> storedImages(feedbackId).stream());
        Stream<LegacyFeedbackImage> pending = list(pendingPrefix, null).objects().stream()
            .flatMap(
                object -> imageIdOf(object.key(), pendingPrefix).stream()
                    .map(imageId -> LegacyFeedbackImage.pending(object.key(), imageId))
            );
        return new LegacyFeedbackImages(Stream.concat(stored, pending).toList());
    }

    public Optional<ImageContent> read(UUID feedbackId, UUID imageId) {
        String storedPrefix = FEEDBACK_PREFIX + feedbackId + "/" + IMAGES_FOLDER;
        return Stream.of(ImageFormat.values())
            .flatMap(
                format -> Stream.of(storedPrefix, pendingPrefix)
                    .map(prefix -> prefix + imageId + "." + format.extension())
            )
            .map(this::readIfExists)
            .flatMap(Optional::stream)
            .findFirst();
    }

    public void delete(String key) {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
        } catch (SdkException exception) {
            throw infrastructure();
        }
    }

    public void deleteFolder(UUID feedbackId) {
        list(FEEDBACK_PREFIX + feedbackId + "/", null).objects().forEach(object -> delete(object.key()));
    }

    private Optional<ImageContent> readIfExists(String key) {
        try {
            ResponseBytes<GetObjectResponse> object = s3Client.getObjectAsBytes(
                GetObjectRequest.builder().bucket(bucket).key(key).build()
            );
            return Optional.of(new ImageContent(object.asByteArray(), object.response().contentType()));
        } catch (NoSuchKeyException exception) {
            return Optional.empty();
        } catch (SdkException exception) {
            throw infrastructure();
        }
    }

    private List<UUID> feedbackFolders() {
        return list(FEEDBACK_PREFIX, "/").prefixes().stream()
            .flatMap(prefix -> uuidOf(prefix.substring(FEEDBACK_PREFIX.length(), prefix.length() - 1)).stream())
            .toList();
    }

    private List<LegacyFeedbackImage> storedImages(UUID feedbackId) {
        String prefix = FEEDBACK_PREFIX + feedbackId + "/" + IMAGES_FOLDER;
        return list(prefix, null).objects().stream()
            .flatMap(
                object -> imageIdOf(object.key(), prefix).stream()
                    .map(imageId -> LegacyFeedbackImage.stored(object.key(), imageId, feedbackId))
            )
            .toList();
    }

    private static Optional<UUID> imageIdOf(String key, String prefix) {
        String fileName = key.substring(prefix.length());
        int extensionStart = fileName.lastIndexOf('.');
        if (extensionStart <= 0) {
            return Optional.empty();
        }
        return uuidOf(fileName.substring(0, extensionStart));
    }

    private static Optional<UUID> uuidOf(String value) {
        try {
            return Optional.of(UUID.fromString(value));
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
    }

    private Listing list(String prefix, String delimiter) {
        List<S3Object> objects = new ArrayList<>();
        List<String> prefixes = new ArrayList<>();
        String continuationToken = null;
        try {
            do {
                ListObjectsV2Response response = s3Client.listObjectsV2(
                    ListObjectsV2Request.builder()
                        .bucket(bucket)
                        .prefix(prefix)
                        .delimiter(delimiter)
                        .continuationToken(continuationToken)
                        .build()
                );
                objects.addAll(response.contents());
                prefixes.addAll(response.commonPrefixes().stream().map(CommonPrefix::prefix).toList());
                continuationToken = response.nextContinuationToken();
            } while (continuationToken != null);
            return new Listing(List.copyOf(objects), List.copyOf(prefixes));
        } catch (SdkException exception) {
            throw infrastructure();
        }
    }

    private static InfrastructureException infrastructure() {
        return new InfrastructureException("이전 의견 이미지 저장소를 처리하지 못했습니다.");
    }

    private record Listing(List<S3Object> objects, List<String> prefixes) {
    }
}
