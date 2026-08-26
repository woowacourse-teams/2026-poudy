package com.poudy.feedback.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doAnswer;
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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CopyObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.model.S3Object;
import software.amazon.awssdk.services.s3.model.ServerSideEncryption;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

@DisplayName("S3 의견 이미지 저장소")
class S3FeedbackImageRepositoryTest {

    private static final String BUCKET = "poudy-bucket";
    private static final Instant NOW = Instant.parse("2026-08-24T00:00:00Z");

    private final S3Client s3Client = mock(S3Client.class);
    private final S3FeedbackObjectStore objectStore = new S3FeedbackObjectStore(s3Client, BUCKET);
    private final ObjectMapper objectMapper = JsonMapper.builder().build();
    private final S3FeedbackImageRepository repository = new S3FeedbackImageRepository(objectStore, objectMapper);

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
    @DisplayName("pending Put 응답이 유실돼도 생성된 객체를 확인해 같은 ID를 반환한다")
    void confirmsPendingImageAfterLostPutResponse() {
        ProcessedImage processed = new ProcessedImage(FeedbackImageFormat.PNG, new byte[] {1, 2, 3});
        given(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .willThrow(SdkClientException.create("timeout"));
        given(s3Client.headObject(any(HeadObjectRequest.class)))
                .willReturn(HeadObjectResponse.builder().eTag("etag").lastModified(NOW).build());

        FeedbackImage image = repository.savePending(processed);

        assertThat(image.format()).isEqualTo(FeedbackImageFormat.PNG);
        verify(s3Client).headObject(
                argThat((HeadObjectRequest request) -> request.key().endsWith(image.id() + ".png")));
    }

    @Test
    @DisplayName("확장자를 신뢰하지 않고 정확히 한 pending 객체의 실제 형식을 찾는다")
    void resolvesExactlyOnePendingObject() {
        UUID imageId = UUID.randomUUID();
        given(
                s3Client.headObject(
                        argThat(
                                (HeadObjectRequest request) -> request != null && request.key().endsWith(".jpg"))))
                .willThrow(S3Exception.builder().statusCode(404).message("missing").build());
        given(
                s3Client.headObject(
                        argThat(
                                (HeadObjectRequest request) -> request != null && request.key().endsWith(".png"))))
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
                                (HeadObjectRequest request) -> request != null && request.key().endsWith(".jpg"))))
                .willThrow(S3Exception.builder().statusCode(404).message("missing").build());
        given(
                s3Client.headObject(
                        argThat(
                                (HeadObjectRequest request) -> request != null && request.key().endsWith(".png"))))
                .willReturn(
                        HeadObjectResponse.builder()
                                .eTag("etag")
                                .lastModified(NOW.minus(S3FeedbackImageRepository.PENDING_TTL))
                                .build());

        assertThatThrownBy(() -> repository.resolve(List.of(imageId), NOW))
                .isInstanceOf(InvalidFeedbackImageIdException.class);
    }

    @Test
    @DisplayName("claim과 최종 복사 모두 조건부 쓰기와 암호화를 적용한다")
    void claimsAndCopiesConditionally() {
        UUID feedbackId = UUID.randomUUID();
        FeedbackImage image = new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.JPEG);
        S3FeedbackImageRepository.PendingImage pending = new S3FeedbackImageRepository.PendingImage(image, "etag", NOW);

        repository.claimAndCopy(feedbackId, List.of(pending), "sha256", () -> NOW);

        ArgumentCaptor<PutObjectRequest> claimCaptor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(claimCaptor.capture(), any(RequestBody.class));
        PutObjectRequest claim = claimCaptor.getValue();
        assertThat(claim.key()).isEqualTo("poudy/feedback/claims/" + image.id() + ".json");
        assertThat(claim.ifNoneMatch()).isEqualTo("*");
        assertThat(claim.serverSideEncryption()).isEqualTo(ServerSideEncryption.AES256);

        ArgumentCaptor<CopyObjectRequest> copyCaptor = ArgumentCaptor.forClass(CopyObjectRequest.class);
        verify(s3Client).copyObject(copyCaptor.capture());
        CopyObjectRequest copy = copyCaptor.getValue();
        assertThat(copy.key()).isEqualTo("poudy/feedback/" + feedbackId + "/images/" + image.id() + ".jpg");
        assertThat(copy.copySourceIfMatch()).isEqualTo("etag");
        assertThat(copy.ifNoneMatch()).isEqualTo("*");
        assertThat(copy.serverSideEncryption()).isEqualTo(ServerSideEncryption.AES256);
    }

    @Test
    @DisplayName("claim Put 응답이 유실돼도 같은 claim을 확인해 귀속을 계속한다")
    void confirmsClaimAfterLostPutResponse() throws Exception {
        UUID feedbackId = UUID.randomUUID();
        FeedbackImage image = new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.PNG);
        S3FeedbackImageRepository.PendingImage pending = new S3FeedbackImageRepository.PendingImage(image, "etag", NOW);
        String claimKey = "poudy/feedback/claims/" + image.id() + ".json";
        byte[] claimDocument = objectMapper.writeValueAsBytes(
                java.util.Map.of(
                        "feedbackId",
                        feedbackId.toString(),
                        "extension",
                        "png",
                        "sourceETag",
                        "etag",
                        "feedbackDocumentSha256",
                        "sha256",
                        "claimedAt",
                        NOW.toString()));
        given(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .willThrow(SdkClientException.create("timeout"));
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class)))
                .willReturn(
                        ListObjectsV2Response.builder()
                                .contents(S3Object.builder().key(claimKey).build())
                                .build());
        given(s3Client.getObjectAsBytes(any(GetObjectRequest.class)))
                .willReturn(ResponseBytes.fromByteArray(GetObjectResponse.builder().build(), claimDocument));

        S3FeedbackImageRepository.Claim claim = repository
                .claimAndCopy(feedbackId, List.of(pending), "sha256", () -> NOW);

        assertThat(claim.images()).containsExactly(image);
        verify(s3Client).copyObject(any(CopyObjectRequest.class));
    }

    @Test
    @DisplayName("claim Put 결과와 동일 claim 확인이 모두 불명확하면 인프라 실패로 처리한다")
    void preservesUnknownClaimOutcome() {
        UUID feedbackId = UUID.randomUUID();
        FeedbackImage image = new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.PNG);
        S3FeedbackImageRepository.PendingImage pending = new S3FeedbackImageRepository.PendingImage(image, "etag", NOW);
        given(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .willThrow(SdkClientException.create("put timeout"));
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class)))
                .willThrow(SdkClientException.create("verification timeout"));

        assertThatThrownBy(() -> repository.claimAndCopy(feedbackId, List.of(pending), "sha256", () -> NOW))
                .isInstanceOf(InfrastructureException.class);

        verify(s3Client, never()).copyObject(any(CopyObjectRequest.class));
    }

    @Test
    @DisplayName("각 이미지 claim 직전 시각으로 pending 만료를 다시 검사한다")
    void rechecksExpirationBeforeEveryClaim() {
        UUID firstId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID secondId = UUID.fromString("00000000-0000-0000-0000-000000000002");
        S3FeedbackImageRepository.PendingImage first = new S3FeedbackImageRepository.PendingImage(
                new FeedbackImage(firstId, FeedbackImageFormat.PNG),
                "first-etag",
                NOW);
        S3FeedbackImageRepository.PendingImage expiring = new S3FeedbackImageRepository.PendingImage(
                new FeedbackImage(secondId, FeedbackImageFormat.JPEG),
                "second-etag",
                NOW.minus(S3FeedbackImageRepository.PENDING_TTL).plusSeconds(1));
        AtomicInteger calls = new AtomicInteger();

        assertThatThrownBy(
                () -> repository.claimAndCopy(
                        UUID.randomUUID(),
                        List.of(first, expiring),
                        "sha256",
                        () -> calls.getAndIncrement() == 0 ? NOW : NOW.plusSeconds(2)))
                .isInstanceOf(InvalidFeedbackImageIdException.class);

        verify(s3Client, times(1)).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    @DisplayName("resolve 뒤 claim 시점에 만료된 pending 이미지를 거절한다")
    void rejectsPendingImageExpiredBeforeClaim() {
        UUID feedbackId = UUID.randomUUID();
        FeedbackImage image = new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.JPEG);
        S3FeedbackImageRepository.PendingImage pending = new S3FeedbackImageRepository.PendingImage(
                image,
                "etag",
                NOW.minus(S3FeedbackImageRepository.PENDING_TTL));

        assertThatThrownBy(() -> repository.claimAndCopy(feedbackId, List.of(pending), "sha256", () -> NOW))
                .isInstanceOf(InvalidFeedbackImageIdException.class);

        verify(s3Client, never()).putObject(any(PutObjectRequest.class), any(RequestBody.class));
        verify(s3Client, never()).copyObject(any(CopyObjectRequest.class));
    }

    @Test
    @DisplayName("pending 삭제 결과가 불명확하면 claim을 지우지 않는다")
    void preservesClaimWhenPendingDeletionIsUnknown() {
        UUID feedbackId = UUID.randomUUID();
        FeedbackImage image = new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.PNG);
        S3FeedbackImageRepository.Claim claim = new S3FeedbackImageRepository.Claim(
                feedbackId,
                List.of(image));
        given(s3Client.deleteObject(argThat((DeleteObjectRequest request) -> request.key().contains("/pending/"))))
                .willThrow(SdkClientException.create("timeout"));

        assertThat(repository.commit(claim)).isFalse();

        verify(s3Client, never())
                .deleteObject(argThat((DeleteObjectRequest request) -> request.key().contains("/claims/")));
    }

    @Test
    @DisplayName("동시에 같은 이미지 ID를 claim하면 한 요청만 성공한다")
    void allowsOnlyOneConcurrentClaim() throws Exception {
        UUID imageId = UUID.randomUUID();
        S3FeedbackImageRepository.PendingImage pending = new S3FeedbackImageRepository.PendingImage(
                new FeedbackImage(imageId, FeedbackImageFormat.PNG),
                "etag",
                NOW);
        AtomicBoolean claimed = new AtomicBoolean();
        doAnswer(invocation -> {
            PutObjectRequest request = invocation.getArgument(0);
            if (request.key().contains("/claims/") && !claimed.compareAndSet(false, true)) {
                throw S3Exception.builder().statusCode(412).message("claimed").build();
            }
            return null;
        })
                .when(s3Client)
                .putObject(any(PutObjectRequest.class), any(RequestBody.class));
        CountDownLatch start = new CountDownLatch(1);

        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<Boolean> first = executor.submit(() -> claimAfter(start, UUID.randomUUID(), pending));
            Future<Boolean> second = executor.submit(() -> claimAfter(start, UUID.randomUUID(), pending));
            start.countDown();

            assertThat(List.of(resultOf(first), resultOf(second))).containsExactlyInAnyOrder(true, false);
        }
    }

    @Test
    @DisplayName("오래된 claim의 JSON hash가 일치하면 pending을 소비하고 claim을 정리한다")
    void reconcilesCommittedClaim() throws Exception {
        UUID feedbackId = UUID.randomUUID();
        UUID imageId = UUID.randomUUID();
        byte[] feedbackDocument = "{\"feedbackId\":\"committed\"}".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        String feedbackSha = S3FeedbackObjectStore.sha256(feedbackDocument);
        String claimKey = "poudy/feedback/claims/" + imageId + ".json";
        String feedbackKey = "poudy/feedback/" + feedbackId + ".json";
        byte[] claimDocument = objectMapper.writeValueAsBytes(
                java.util.Map.of(
                        "feedbackId",
                        feedbackId.toString(),
                        "extension",
                        "png",
                        "sourceETag",
                        "etag",
                        "feedbackDocumentSha256",
                        feedbackSha,
                        "claimedAt",
                        NOW.minus(S3FeedbackImageRepository.CLAIM_GRACE_PERIOD).minusSeconds(1).toString()));
        S3Object claimObject = S3Object.builder()
                .key(claimKey)
                .lastModified(NOW.minus(S3FeedbackImageRepository.CLAIM_GRACE_PERIOD).minusSeconds(1))
                .build();

        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class))).willAnswer(invocation -> {
            ListObjectsV2Request request = invocation.getArgument(0);
            if ("poudy/feedback/claims/".equals(request.prefix())) {
                return ListObjectsV2Response.builder().contents(claimObject).build();
            }
            if (feedbackKey.equals(request.prefix())) {
                return ListObjectsV2Response.builder()
                        .contents(S3Object.builder().key(feedbackKey).build())
                        .build();
            }
            return ListObjectsV2Response.builder().contents(List.of()).build();
        });
        given(s3Client.getObjectAsBytes(any(GetObjectRequest.class))).willAnswer(invocation -> {
            GetObjectRequest request = invocation.getArgument(0);
            byte[] body = claimKey.equals(request.key()) ? claimDocument : feedbackDocument;
            return ResponseBytes.fromByteArray(GetObjectResponse.builder().build(), body);
        });

        S3FeedbackImageRepository.CleanupCounts counts = repository.reconcileClaims(NOW);

        assertThat(counts.committedClaims()).isEqualTo(1);
        verify(s3Client).deleteObject(
                argThat(
                        (DeleteObjectRequest request) -> request != null && request.key().contains("/pending/")));
        verify(s3Client).deleteObject(
                argThat(
                        (DeleteObjectRequest request) -> request != null && request.key().equals(claimKey)));
    }

    @Test
    @DisplayName("고아 이미지 정리는 전체 목록에서 의견 문서를 함께 판정한다")
    void cleansOrphanedImagesWithoutPerImageListRequests() {
        UUID existingFeedbackId = UUID.randomUUID();
        UUID orphanedFeedbackId = UUID.randomUUID();
        UUID existingImageId = UUID.randomUUID();
        UUID orphanedImageId = UUID.randomUUID();
        String existingFeedbackKey = "poudy/feedback/" + existingFeedbackId + ".json";
        String existingImageKey = "poudy/feedback/" + existingFeedbackId + "/images/" + existingImageId + ".png";
        String orphanedImageKey = "poudy/feedback/" + orphanedFeedbackId + "/images/" + orphanedImageId + ".jpg";
        Instant old = NOW.minus(S3FeedbackImageRepository.CLAIM_GRACE_PERIOD).minusSeconds(1);

        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class))).willAnswer(invocation -> {
            ListObjectsV2Request request = invocation.getArgument(0);
            if ("poudy/feedback/pending/".equals(request.prefix())) {
                return ListObjectsV2Response.builder().contents(List.of()).build();
            }
            if ("poudy/feedback/".equals(request.prefix())) {
                return ListObjectsV2Response.builder()
                        .contents(
                                S3Object.builder().key(existingFeedbackKey).lastModified(old).build(),
                                S3Object.builder().key(existingImageKey).lastModified(old).build(),
                                S3Object.builder().key(orphanedImageKey).lastModified(old).build())
                        .build();
            }
            throw new AssertionError("예상하지 않은 prefix: " + request.prefix());
        });

        S3FeedbackImageRepository.CleanupCounts counts = repository.cleanupStorage(NOW);

        assertThat(counts.orphanedFinalImages()).isEqualTo(1);
        verify(s3Client).deleteObject(
                argThat((DeleteObjectRequest request) -> orphanedImageKey.equals(request.key())));
        verify(s3Client, never()).deleteObject(
                argThat((DeleteObjectRequest request) -> existingImageKey.equals(request.key())));
        verify(s3Client, times(1)).listObjectsV2(
                argThat((ListObjectsV2Request request) -> "poudy/feedback/".equals(request.prefix())));
    }

    @Test
    @DisplayName("목록 조회 장애를 빈 정리 결과로 숨기지 않는다")
    void exposesListFailureDuringReconciliation() {
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class)))
                .willThrow(SdkClientException.create("timeout"));

        assertThatThrownBy(() -> repository.reconcileClaims(NOW))
                .isInstanceOf(InfrastructureException.class);
    }

    @Test
    @DisplayName("claim 본문 조회 장애를 손상 문서로 숨기지 않는다")
    void exposesClaimReadFailureDuringReconciliation() {
        S3Object claimObject = S3Object.builder()
                .key("poudy/feedback/claims/" + UUID.randomUUID() + ".json")
                .lastModified(NOW.minus(S3FeedbackImageRepository.CLAIM_GRACE_PERIOD).minusSeconds(1))
                .build();
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class)))
                .willReturn(ListObjectsV2Response.builder().contents(claimObject).build());
        given(s3Client.getObjectAsBytes(any(GetObjectRequest.class)))
                .willThrow(SdkClientException.create("access denied"));

        assertThatThrownBy(() -> repository.reconcileClaims(NOW))
                .isInstanceOf(InfrastructureException.class);
    }

    @Test
    @DisplayName("개별 claim 존재 조회 장애를 빈 정리 결과로 숨기지 않는다")
    void exposesExactLookupFailureDuringCleanup() {
        FeedbackImage image = new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.PNG);
        S3Object pendingObject = S3Object.builder()
                .key("poudy/feedback/pending/" + image.id() + ".png")
                .lastModified(NOW.minus(S3FeedbackImageRepository.PENDING_TTL).minusSeconds(1))
                .build();
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class))).willAnswer(invocation -> {
            ListObjectsV2Request request = invocation.getArgument(0);
            if ("poudy/feedback/pending/".equals(request.prefix())) {
                return ListObjectsV2Response.builder().contents(pendingObject).build();
            }
            throw SdkClientException.create("access denied");
        });

        assertThatThrownBy(() -> repository.cleanupStorage(NOW))
                .isInstanceOf(InfrastructureException.class);
    }

    @Test
    @DisplayName("정리 삭제 장애를 성공 0건으로 숨기지 않는다")
    void exposesDeleteFailureDuringCleanup() {
        FeedbackImage image = new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.JPEG);
        S3Object pendingObject = S3Object.builder()
                .key("poudy/feedback/pending/" + image.id() + ".jpg")
                .lastModified(NOW.minus(S3FeedbackImageRepository.PENDING_TTL).minusSeconds(1))
                .build();
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class))).willAnswer(invocation -> {
            ListObjectsV2Request request = invocation.getArgument(0);
            if ("poudy/feedback/pending/".equals(request.prefix())) {
                return ListObjectsV2Response.builder().contents(pendingObject).build();
            }
            return ListObjectsV2Response.builder().contents(List.of()).build();
        });
        given(s3Client.deleteObject(any(DeleteObjectRequest.class)))
                .willThrow(SdkClientException.create("access denied"));

        assertThatThrownBy(() -> repository.cleanupStorage(NOW))
                .isInstanceOf(InfrastructureException.class);
    }

    @Test
    @DisplayName("필수 필드가 없는 claim이 다른 claim 조정 주기를 중단하지 않는다")
    void skipsMalformedClaimDocument() {
        UUID imageId = UUID.randomUUID();
        String claimKey = "poudy/feedback/claims/" + imageId + ".json";
        S3Object claimObject = S3Object.builder()
                .key(claimKey)
                .lastModified(NOW.minus(S3FeedbackImageRepository.CLAIM_GRACE_PERIOD).minusSeconds(1))
                .build();
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class)))
                .willReturn(ListObjectsV2Response.builder().contents(claimObject).build());
        given(s3Client.getObjectAsBytes(any(GetObjectRequest.class)))
                .willReturn(ResponseBytes.fromByteArray(GetObjectResponse.builder().build(), "{}".getBytes()));

        S3FeedbackImageRepository.CleanupCounts counts = repository.reconcileClaims(NOW);

        assertThat(counts.total()).isZero();
        verify(s3Client, never()).deleteObject(any(DeleteObjectRequest.class));
    }

    private boolean claimAfter(
            CountDownLatch start,
            UUID feedbackId,
            S3FeedbackImageRepository.PendingImage pending)
            throws Exception {
        start.await();
        try {
            repository.claimAndCopy(feedbackId, List.of(pending), "sha256", () -> NOW);
            return true;
        } catch (InvalidFeedbackImageIdException exception) {
            return false;
        }
    }

    private static boolean resultOf(Future<Boolean> future) throws InterruptedException, ExecutionException {
        return future.get();
    }
}
