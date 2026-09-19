package com.poudy.feedback.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.poudy.exception.InfrastructureException;
import com.poudy.feedback.domain.FeedbackImage;
import com.poudy.feedback.domain.FeedbackImageFormat;
import com.poudy.feedback.domain.InvalidFeedbackImageIdException;
import com.poudy.feedback.service.FeedbackImageProcessor.ProcessedImage;
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
    private static final Instant NOW = Instant.parse("2026-08-24T00:00:00Z");

    private final S3Client s3Client = mock(S3Client.class);
    private final S3FeedbackObjectStore objectStore = new S3FeedbackObjectStore(s3Client, BUCKET);
    private final S3FeedbackImageRepository repository = new S3FeedbackImageRepository(objectStore);

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

        List<S3FeedbackImageRepository.PendingImage> resolved = repository.resolve(List.of(imageId), NOW);

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
                    .lastModified(NOW.minus(S3FeedbackImageRepository.PENDING_TTL))
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
    @DisplayName("만료 뒤 유예 시간이 지난 pending 만 정리 대상이다")
    void allowsCleanupOnlyAfterGracePeriod() {
        FeedbackImage image = new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.JPEG);
        S3FeedbackImageRepository.PendingImage pending = new S3FeedbackImageRepository.PendingImage(image, "etag", NOW);
        Instant expiredAt = NOW.plus(S3FeedbackImageRepository.PENDING_TTL);

        assertThat(pending.isExpired(expiredAt)).isTrue();
        assertThat(pending.canBeCleanedUp(expiredAt)).isFalse();
        assertThat(pending.canBeCleanedUp(expiredAt.plus(S3FeedbackImageRepository.CLEANUP_GRACE_PERIOD))).isTrue();
    }
}
