package com.poudy.feedback.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.poudy.exception.InfrastructureException;
import com.poudy.feedback.domain.image.FeedbackImage;
import com.poudy.feedback.domain.image.FeedbackImageFormat;
import com.poudy.feedback.domain.image.InvalidFeedbackImageIdException;
import com.poudy.feedback.domain.image.PendingImage;
import com.poudy.feedback.domain.image.ProcessedImage;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.core.exception.SdkClientException;
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

@DisplayName("S3 의견 이미지 저장소")
class S3FeedbackImageRepositoryTest {

    private static final String BUCKET = "poudy-bucket";
    private static final String PENDING_PREFIX = "poudy/feedback/pending/";
    private static final String STAGING_PENDING_PREFIX = "poudy/staging/feedback/pending/";
    private static final Instant NOW = Instant.parse("2026-08-24T00:00:00Z");

    private final S3Client s3Client = mock(S3Client.class);
    private final S3FeedbackImageRepository repository = new S3FeedbackImageRepository(
        s3Client,
        BUCKET,
        PENDING_PREFIX
    );

    @Test
    @DisplayName("재인코딩 바이트를 추측하기 어려운 pending 키에 비공개 암호화해 저장한다")
    void storesPendingImage() {
        ProcessedImage processed = new ProcessedImage(FeedbackImageFormat.PNG, new byte[] {1, 2, 3});

        FeedbackImage image = repository.savePending(processed);

        ArgumentCaptor<PutObjectRequest> requestCaptor = ArgumentCaptor.forClass(PutObjectRequest.class);
        ArgumentCaptor<RequestBody> bodyCaptor = ArgumentCaptor.forClass(RequestBody.class);
        verify(s3Client).putObject(requestCaptor.capture(), bodyCaptor.capture());
        PutObjectRequest request = requestCaptor.getValue();
        assertThat(request.bucket()).isEqualTo(BUCKET);
        assertThat(request.key()).isEqualTo("poudy/feedback/pending/" + image.id() + ".png");
        assertThat(request.contentType()).isEqualTo("image/png");
        assertThat(request.ifNoneMatch()).isEqualTo("*");
        assertThat(request.serverSideEncryption()).isEqualTo(ServerSideEncryption.AES256);
    }

    @Test
    @DisplayName("pending Put 실패를 재시도하지 않고 인프라 예외로 변환한다")
    void doesNotRetryFailedPendingWrite() {
        ProcessedImage processed = new ProcessedImage(FeedbackImageFormat.PNG, new byte[] {1, 2, 3});
        given(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
            .willThrow(SdkClientException.create("timeout"));

        assertThatThrownBy(() -> repository.savePending(processed))
            .isInstanceOf(InfrastructureException.class);

        verify(s3Client, times(1)).putObject(any(PutObjectRequest.class), any(RequestBody.class));
        verify(s3Client, never()).headObject(any(HeadObjectRequest.class));
    }

    @Test
    @DisplayName("확장자를 신뢰하지 않고 정확히 한 pending 객체의 실제 형식을 찾는다")
    void resolvesExactlyOnePendingObject() {
        UUID imageId = UUID.randomUUID();
        given(
            s3Client.headObject(
                argThat(
                    (HeadObjectRequest request) -> request != null && request.key().endsWith(".jpg")
                )
            )
        )
            .willThrow(S3Exception.builder().statusCode(404).message("missing").build());
        given(
            s3Client.headObject(
                argThat(
                    (HeadObjectRequest request) -> request != null && request.key().endsWith(".png")
                )
            )
        )
            .willReturn(HeadObjectResponse.builder().eTag("etag").lastModified(NOW.minusSeconds(60)).build());

        List<PendingImage> resolved = repository.resolve(List.of(imageId), NOW);

        assertThat(resolved).singleElement().satisfies(image -> {
            assertThat(image.image().id()).isEqualTo(imageId);
            assertThat(image.image().format()).isEqualTo(FeedbackImageFormat.PNG);
            assertThat(image.eTag()).isEqualTo("etag");
        });
    }

    @Test
    @DisplayName("24시간이 지난 pending ID를 거절한다")
    void rejectsExpiredPendingImage() {
        UUID imageId = UUID.randomUUID();
        given(
            s3Client.headObject(
                argThat(
                    (HeadObjectRequest request) -> request != null && request.key().endsWith(".jpg")
                )
            )
        )
            .willThrow(S3Exception.builder().statusCode(404).message("missing").build());
        given(
            s3Client.headObject(
                argThat(
                    (HeadObjectRequest request) -> request != null && request.key().endsWith(".png")
                )
            )
        )
            .willReturn(
                HeadObjectResponse.builder()
                    .eTag("etag")
                    .lastModified(NOW.minus(PendingImage.TTL))
                    .build()
            );

        assertThatThrownBy(() -> repository.resolve(List.of(imageId), NOW))
            .isInstanceOf(InvalidFeedbackImageIdException.class);
    }

    @Test
    @DisplayName("pending 을 원본 ETag 조건으로 최종 경로에 복사한 뒤 pending 을 지운다")
    void transfersPendingImageToFeedback() {
        UUID feedbackId = UUID.randomUUID();
        FeedbackImage image = new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.PNG);
        given(s3Client.headObject(any(HeadObjectRequest.class)))
            .willReturn(HeadObjectResponse.builder().eTag("etag").lastModified(NOW).build());

        assertThat(repository.transfer(feedbackId, image)).isTrue();

        ArgumentCaptor<CopyObjectRequest> copy = ArgumentCaptor.forClass(CopyObjectRequest.class);
        verify(s3Client).copyObject(copy.capture());
        assertThat(copy.getValue().destinationKey())
            .isEqualTo("poudy/feedback/" + feedbackId + "/images/" + image.id() + ".png");
        assertThat(copy.getValue().copySourceIfMatch()).isEqualTo("etag");
        assertThat(copy.getValue().serverSideEncryption()).isEqualTo(ServerSideEncryption.AES256);
        verify(s3Client).deleteObject(
            argThat(
                (DeleteObjectRequest request) -> request.key().equals("poudy/feedback/pending/" + image.id() + ".png")
            )
        );
    }

    @Test
    @DisplayName("pending 이 없고 최종 파일이 있으면 이미 옮긴 것으로 본다")
    void treatsMissingPendingWithFinalImageAsTransferred() {
        UUID feedbackId = UUID.randomUUID();
        FeedbackImage image = new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.JPEG);
        String finalKey = "poudy/feedback/" + feedbackId + "/images/" + image.id() + ".jpg";
        given(s3Client.headObject(any(HeadObjectRequest.class)))
            .willThrow(S3Exception.builder().statusCode(404).message("missing").build());
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class)))
            .willReturn(ListObjectsV2Response.builder().contents(S3Object.builder().key(finalKey).build()).build());

        assertThat(repository.transfer(feedbackId, image)).isTrue();
        verify(s3Client, never()).copyObject(any(CopyObjectRequest.class));
    }

    @Test
    @DisplayName("pending 과 최종 파일이 모두 없으면 옮기지 못한 것으로 알린다")
    void reportsLostImage() {
        FeedbackImage image = new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.JPEG);
        given(s3Client.headObject(any(HeadObjectRequest.class)))
            .willThrow(S3Exception.builder().statusCode(404).message("missing").build());
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class)))
            .willReturn(ListObjectsV2Response.builder().contents(List.of()).build());

        assertThat(repository.transfer(UUID.randomUUID(), image)).isFalse();
    }

    @Test
    @DisplayName("복사 중 다른 처리가 pending 을 먼저 옮겼으면 최종 파일로 결과를 확인한다")
    void confirmsTransferAfterConcurrentMove() {
        UUID feedbackId = UUID.randomUUID();
        FeedbackImage image = new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.PNG);
        String finalKey = "poudy/feedback/" + feedbackId + "/images/" + image.id() + ".png";
        given(s3Client.headObject(any(HeadObjectRequest.class)))
            .willReturn(HeadObjectResponse.builder().eTag("etag").lastModified(NOW).build());
        given(s3Client.copyObject(any(CopyObjectRequest.class)))
            .willThrow(S3Exception.builder().statusCode(404).message("gone").build());
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class)))
            .willReturn(ListObjectsV2Response.builder().contents(S3Object.builder().key(finalKey).build()).build());

        assertThat(repository.transfer(feedbackId, image)).isTrue();
        verify(s3Client, never()).deleteObject(any(DeleteObjectRequest.class));
    }

    @Test
    @DisplayName("복사 장애는 다음 주기에 다시 시도하도록 인프라 예외로 알린다")
    void exposesCopyFailure() {
        FeedbackImage image = new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.PNG);
        given(s3Client.headObject(any(HeadObjectRequest.class)))
            .willReturn(HeadObjectResponse.builder().eTag("etag").lastModified(NOW).build());
        given(s3Client.copyObject(any(CopyObjectRequest.class)))
            .willThrow(SdkClientException.create("network"));

        assertThatThrownBy(() -> repository.transfer(UUID.randomUUID(), image))
            .isInstanceOf(InfrastructureException.class);
        verify(s3Client, never()).deleteObject(any(DeleteObjectRequest.class));
    }

    @Test
    @DisplayName("pending 목록에서 이미지 키만 이미지로 읽고 올린 시각을 함께 돌려준다")
    void listsPendingImages() {
        UUID imageId = UUID.randomUUID();
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class))).willReturn(
            ListObjectsV2Response.builder()
                .contents(
                    S3Object.builder().key("poudy/feedback/pending/" + imageId + ".jpg").eTag("etag").lastModified(NOW)
                        .build(),
                    S3Object.builder().key("poudy/feedback/pending/not-an-image.txt").lastModified(NOW).build(),
                    S3Object.builder().key("poudy/feedback/pending/" + UUID.randomUUID() + ".gif").lastModified(NOW)
                        .build()
                )
                .build()
        );

        assertThat(repository.findAllPending()).singleElement().satisfies(pending -> {
            assertThat(pending.image()).isEqualTo(new FeedbackImage(imageId, FeedbackImageFormat.JPEG));
            assertThat(pending.lastModified()).isEqualTo(NOW);
        });
    }

    @Test
    @DisplayName("버킷을 함께 쓰는 환경은 설정한 pending 경로에만 저장하고 그 경로만 조회·삭제한다")
    void isolatesPendingImagesByConfiguredPrefix() {
        S3FeedbackImageRepository staging = new S3FeedbackImageRepository(s3Client, BUCKET, STAGING_PENDING_PREFIX);
        UUID imageId = UUID.randomUUID();
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class))).willReturn(
            ListObjectsV2Response.builder()
                .contents(
                    S3Object.builder().key(STAGING_PENDING_PREFIX + imageId + ".jpg").eTag("etag").lastModified(NOW)
                        .build()
                )
                .build()
        );

        FeedbackImage saved = staging.savePending(new ProcessedImage(FeedbackImageFormat.PNG, new byte[] {1}));
        List<PendingImage> pending = staging.findAllPending();
        staging.deletePending(pending.getFirst().image());

        verify(s3Client).putObject(
            argThat((PutObjectRequest request) -> request.key().equals(STAGING_PENDING_PREFIX + saved.id() + ".png")),
            any(RequestBody.class)
        );
        verify(s3Client).listObjectsV2(
            argThat((ListObjectsV2Request request) -> request.prefix().equals(STAGING_PENDING_PREFIX))
        );
        verify(s3Client).deleteObject(
            argThat((DeleteObjectRequest request) -> request.key().equals(STAGING_PENDING_PREFIX + imageId + ".jpg"))
        );
    }

    @Test
    @DisplayName("만료 뒤 유예 시간이 지난 pending 만 정리 대상이다")
    void allowsCleanupOnlyAfterGracePeriod() {
        FeedbackImage image = new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.JPEG);
        PendingImage pending = new PendingImage(image, "etag", NOW);
        Instant expiredAt = NOW.plus(PendingImage.TTL);

        assertThat(pending.isExpired(expiredAt)).isTrue();
        assertThat(pending.canBeCleanedUp(expiredAt)).isFalse();
        assertThat(pending.canBeCleanedUp(expiredAt.plus(PendingImage.CLEANUP_GRACE_PERIOD))).isTrue();
    }

    @Test
    @DisplayName("보유기간이 끝나면 형식을 몰라도 의견 경로 아래 파일을 모두 삭제한다")
    void deletesRetainedFeedbackData() {
        UUID feedbackId = UUID.randomUUID();
        String imageKey = "poudy/feedback/" + feedbackId + "/images/" + UUID.randomUUID() + ".png";
        given(
            s3Client.listObjectsV2(
                argThat(
                    (ListObjectsV2Request request) -> request != null
                        && request.prefix().equals("poudy/feedback/" + feedbackId + "/")
                )
            )
        ).willReturn(ListObjectsV2Response.builder().contents(S3Object.builder().key(imageKey).build()).build());

        repository.deleteRetainedData(feedbackId);

        verify(s3Client).deleteObject(argThat((DeleteObjectRequest request) -> request.key().equals(imageKey)));
    }

    @Test
    @DisplayName("저장된 이미지 형식은 최종 경로에서 찾고, 아직 옮기지 못한 이미지는 pending 에서 찾고, 파일이 없는 이미지는 뺀다")
    void findsStoredImagesFromFinalOrPending() {
        UUID feedbackId = UUID.randomUUID();
        UUID transferred = UUID.randomUUID();
        UUID pending = UUID.randomUUID();
        UUID lost = UUID.randomUUID();
        given(
            s3Client.listObjectsV2(
                argThat(
                    (ListObjectsV2Request request) -> request != null
                        && request.prefix().equals("poudy/feedback/" + feedbackId + "/images/")
                )
            )
        ).willReturn(
            ListObjectsV2Response.builder()
                .contents(
                    S3Object.builder().key("poudy/feedback/" + feedbackId + "/images/" + transferred + ".jpg").build()
                )
                .build()
        );
        given(s3Client.headObject(any(HeadObjectRequest.class)))
            .willThrow(S3Exception.builder().statusCode(404).message("missing").build());
        willReturn(HeadObjectResponse.builder().eTag("etag").lastModified(NOW).build())
            .given(s3Client)
            .headObject(
                argThat(
                    (HeadObjectRequest request) -> request != null
                        && request.key().equals(PENDING_PREFIX + pending + ".png")
                )
            );

        List<FeedbackImage> found = repository.findStored(feedbackId, List.of(pending, lost, transferred));

        assertThat(found).containsExactly(
            new FeedbackImage(pending, FeedbackImageFormat.PNG),
            new FeedbackImage(transferred, FeedbackImageFormat.JPEG)
        );
    }
}
