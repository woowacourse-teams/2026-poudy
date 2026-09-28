package com.poudy.feedback.repository;

import com.poudy.exception.InfrastructureException;
import com.poudy.feedback.domain.image.FeedbackImage;
import com.poudy.feedback.domain.image.FeedbackImageFormat;
import com.poudy.feedback.domain.image.InvalidFeedbackImageIdException;
import com.poudy.feedback.domain.image.PendingImage;
import com.poudy.feedback.domain.image.ProcessedImage;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CopyObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.model.S3Object;
import software.amazon.awssdk.services.s3.model.ServerSideEncryption;

@Repository
public class S3FeedbackImageRepository {

    private static final Logger log = LoggerFactory.getLogger(S3FeedbackImageRepository.class);

    private static final String FEEDBACK_PREFIX = "poudy/feedback/";

    private final S3Client s3Client;
    private final String bucket;
    private final String pendingPrefix;

    public S3FeedbackImageRepository(
        @Qualifier("feedbackImageS3Client") S3Client s3Client,
        @Value("${poudy.feedback.image-s3.bucket:}") String bucket,
        @Value("${poudy.feedback.image-s3.pending-prefix}") String pendingPrefix
    ) {
        this.s3Client = s3Client;
        this.bucket = bucket;
        this.pendingPrefix = pendingPrefix;
    }

    public FeedbackImage savePending(ProcessedImage processed) {
        FeedbackImage image = FeedbackImage.create(processed.format());
        try {
            PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucket)
                .key(pendingKey(image))
                .contentType(image.format().contentType())
                .serverSideEncryption(ServerSideEncryption.AES256)
                .ifNoneMatch("*")
                .build();
            s3Client.putObject(request, RequestBody.fromBytes(processed.bytes()));
            return image;
        } catch (SdkException exception) {
            throw infrastructure();
        }
    }

    public void cleanupPending(List<FeedbackImage> images) {
        images.forEach(image -> deleteQuietly(pendingKey(image)));
    }

    public List<PendingImage> resolve(List<UUID> imageIds, Instant now) {
        return imageIds.stream().map(imageId -> resolve(imageId, now)).toList();
    }

    public List<PendingImage> findAllPending() {
        return listAll(pendingPrefix).stream()
            .flatMap(object -> pendingImageOf(object).stream())
            .toList();
    }

    public List<FeedbackImage> findStored(UUID feedbackId, List<UUID> imageIds) {
        if (imageIds.isEmpty()) {
            return List.of();
        }
        String prefix = imagesPrefix(feedbackId);
        Map<UUID, FeedbackImage> transferred = listAll(prefix).stream()
            .flatMap(object -> imageOf(object.key().substring(prefix.length())).stream())
            .collect(Collectors.toMap(FeedbackImage::id, Function.identity(), (first, ignored) -> first));
        return imageIds.stream()
            .flatMap(imageId -> findStored(feedbackId, imageId, transferred).stream())
            .toList();
    }

    private Optional<FeedbackImage> findStored(UUID feedbackId, UUID imageId, Map<UUID, FeedbackImage> transferred) {
        Optional<FeedbackImage> found = Optional.ofNullable(transferred.get(imageId)).or(() -> findPending(imageId));
        if (found.isEmpty()) {
            log.error("의견 이미지 파일을 찾지 못했습니다. feedbackId={}, imageId={}", feedbackId, imageId);
        }
        return found;
    }

    private Optional<FeedbackImage> findPending(UUID imageId) {
        return Stream.of(FeedbackImageFormat.JPEG, FeedbackImageFormat.PNG)
            .flatMap(format -> head(new FeedbackImage(imageId, format)).stream())
            .map(PendingImage::image)
            .findFirst();
    }

    public boolean transfer(UUID feedbackId, FeedbackImage image) {
        Optional<PendingImage> pending = head(image);
        if (pending.isEmpty()) {
            return existsExactly(finalKey(feedbackId, image));
        }
        try {
            s3Client.copyObject(
                CopyObjectRequest.builder()
                    .bucket(bucket)
                    .key(finalKey(feedbackId, image))
                    .copySource(encode(bucket + "/" + pendingKey(image)))
                    .copySourceIfMatch(pending.get().eTag())
                    .contentType(image.format().contentType())
                    .serverSideEncryption(ServerSideEncryption.AES256)
                    .build()
            );
        } catch (S3Exception exception) {
            if (exception.statusCode() != 404 && exception.statusCode() != 412) {
                throw infrastructure();
            }
            return existsExactly(finalKey(feedbackId, image));
        } catch (SdkException exception) {
            throw infrastructure();
        }
        deleteRequired(pendingKey(image));
        return true;
    }

    public void deletePending(FeedbackImage image) {
        deleteRequired(pendingKey(image));
    }

    public void deleteRetainedData(UUID feedbackId) {
        listAll(FEEDBACK_PREFIX + feedbackId + "/").forEach(object -> deleteRequired(object.key()));
    }

    private PendingImage resolve(UUID imageId, Instant now) {
        List<PendingImage> found = Stream.of(FeedbackImageFormat.JPEG, FeedbackImageFormat.PNG)
            .flatMap(format -> head(new FeedbackImage(imageId, format)).stream())
            .toList();
        if (found.size() != 1 || found.getFirst().isExpired(now)) {
            throw new InvalidFeedbackImageIdException();
        }
        return found.getFirst();
    }

    private Optional<PendingImage> head(FeedbackImage image) {
        try {
            HeadObjectResponse response = s3Client.headObject(
                HeadObjectRequest.builder()
                    .bucket(bucket)
                    .key(pendingKey(image))
                    .build()
            );
            return Optional.of(new PendingImage(image, response.eTag(), response.lastModified()));
        } catch (S3Exception exception) {
            if (exception.statusCode() == 404) {
                return Optional.empty();
            }
            throw infrastructure();
        } catch (SdkException exception) {
            throw infrastructure();
        }
    }

    private Optional<PendingImage> pendingImageOf(S3Object object) {
        return imageOf(object.key().substring(pendingPrefix.length()))
            .map(image -> new PendingImage(image, object.eTag(), object.lastModified()));
    }

    private static Optional<FeedbackImage> imageOf(String fileName) {
        int extensionStart = fileName.lastIndexOf('.');
        if (extensionStart <= 0 || extensionStart == fileName.length() - 1) {
            return Optional.empty();
        }
        try {
            return Optional.of(
                new FeedbackImage(
                    UUID.fromString(fileName.substring(0, extensionStart)),
                    FeedbackImageFormat.fromExtension(fileName.substring(extensionStart + 1))
                )
            );
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
    }

    private boolean existsExactly(String key) {
        try {
            ListObjectsV2Response response = s3Client.listObjectsV2(
                ListObjectsV2Request.builder()
                    .bucket(bucket)
                    .prefix(key)
                    .maxKeys(1)
                    .build()
            );
            return response.contents().stream().anyMatch(object -> key.equals(object.key()));
        } catch (SdkException exception) {
            throw infrastructure();
        }
    }

    private List<S3Object> listAll(String prefix) {
        List<S3Object> objects = new ArrayList<>();
        String continuationToken = null;
        try {
            do {
                ListObjectsV2Response response = s3Client.listObjectsV2(
                    ListObjectsV2Request.builder()
                        .bucket(bucket)
                        .prefix(prefix)
                        .continuationToken(continuationToken)
                        .build()
                );
                objects.addAll(response.contents());
                continuationToken = response.nextContinuationToken();
            } while (continuationToken != null);
            return List.copyOf(objects);
        } catch (SdkException exception) {
            throw infrastructure();
        }
    }

    private void deleteQuietly(String key) {
        try {
            delete(key);
        } catch (SdkException exception) {
            return;
        }
    }

    private void deleteRequired(String key) {
        try {
            delete(key);
        } catch (SdkException exception) {
            throw infrastructure();
        }
    }

    private void delete(String key) {
        s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
    }

    private String pendingKey(FeedbackImage image) {
        return pendingPrefix + image.id() + "." + image.format().extension();
    }

    private static String imagesPrefix(UUID feedbackId) {
        return FEEDBACK_PREFIX + feedbackId + "/images/";
    }

    private static String finalKey(UUID feedbackId, FeedbackImage image) {
        return imagesPrefix(feedbackId) + image.id() + "." + image.format().extension();
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8)
            .replace("+", "%20")
            .replace("%2F", "/");
    }

    private static InfrastructureException infrastructure() {
        return new InfrastructureException("의견 이미지 저장소를 처리하지 못했습니다.");
    }
}
