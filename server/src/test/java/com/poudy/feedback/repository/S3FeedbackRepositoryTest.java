package com.poudy.feedback.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.poudy.exception.InfrastructureException;
import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackContent;
import com.poudy.feedback.domain.FeedbackImage;
import com.poudy.feedback.domain.FeedbackImageFormat;
import com.poudy.feedback.domain.FeedbackPath;
import com.poudy.feedback.domain.FeedbackStatus;
import com.poudy.feedback.domain.FeedbackSubjectType;
import com.poudy.feedback.domain.FeedbackType;
import com.poudy.feedback.domain.ProductCorrection;
import com.poudy.feedback.domain.ServiceFeedback;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Object;
import software.amazon.awssdk.services.s3.model.ServerSideEncryption;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

@DisplayName("S3 의견 저장소")
class S3FeedbackRepositoryTest {

    private static final String BUCKET = "poudy-bucket";
    private static final UUID ID = UUID.fromString("6cacd90d-880d-4a6c-a921-7fb0a85b80d3");
    private static final Instant NOW = Instant.parse("2026-08-23T07:20:30Z");
    private static final OffsetDateTime RECEIVED_AT = OffsetDateTime.parse("2026-08-23T16:20:30+09:00");
    private static final Feedback FEEDBACK = new Feedback(
        ID,
        new ServiceFeedback(FeedbackType.BUG_REPORT, FeedbackPath.from("/products/12345")),
        new FeedbackContent("제품 정보가 실제 패키지와 달라요."),
        RECEIVED_AT
    );

    private final S3Client s3Client = mock(S3Client.class);
    private final S3FeedbackObjectStore objectStore = new S3FeedbackObjectStore(s3Client, BUCKET);
    private final S3FeedbackImageRepository imageRepository = mock(S3FeedbackImageRepository.class);
    private final ObjectMapper objectMapper = JsonMapper.builder().build();
    private final S3FeedbackRepository repository = new S3FeedbackRepository(
        objectStore,
        imageRepository,
        objectMapper
    );

    @Test
    @DisplayName("접수 ID를 객체 키로 사용해 UTF-8 JSON을 저장한다")
    void storesFeedbackAsJson() throws Exception {
        repository.save(FEEDBACK);

        ArgumentCaptor<PutObjectRequest> requestCaptor = ArgumentCaptor.forClass(PutObjectRequest.class);
        ArgumentCaptor<RequestBody> bodyCaptor = ArgumentCaptor.forClass(RequestBody.class);
        verify(s3Client).putObject(requestCaptor.capture(), bodyCaptor.capture());

        PutObjectRequest request = requestCaptor.getValue();
        assertThat(request.bucket()).isEqualTo(BUCKET);
        assertThat(request.key()).isEqualTo("poudy/feedback/" + ID + "/feedback.json");
        assertThat(request.contentType()).isEqualTo("application/json; charset=UTF-8");
        assertThat(request.serverSideEncryption()).isEqualTo(ServerSideEncryption.AES256);
        assertThat(request.ifNoneMatch()).isEqualTo("*");

        byte[] bytes = bodyCaptor.getValue().contentStreamProvider().newStream().readAllBytes();
        JsonNode document = objectMapper.readTree(new String(bytes, StandardCharsets.UTF_8));
        assertThat(document.get("feedbackId").asText()).isEqualTo(ID.toString());
        assertThat(document.get("type").asText()).isEqualTo("BUG_REPORT");
        assertThat(document.get("content").asText()).isEqualTo("제품 정보가 실제 패키지와 달라요.");
        assertThat(document.get("path").asText()).isEqualTo("/products/12345");
        assertThat(document.get("receivedAt").asText()).isEqualTo("2026-08-23T16:20:30+09:00");
        assertThat(document.get("images").isArray()).isTrue();
        assertThat(document.get("images").isEmpty()).isTrue();
    }

    @Test
    @DisplayName("알 수 없는 화면 경로는 null로 저장한다")
    void storesUnknownPathAsNull() throws Exception {
        JsonNode document = storedDocumentOf(
            new Feedback(
                ID,
                new ServiceFeedback(FeedbackType.OTHER, FeedbackPath.from(null)),
                new FeedbackContent("화면과 관계없는 기타 의견입니다."),
                RECEIVED_AT
            )
        );

        assertThat(document.get("path").isNull()).isTrue();
    }

    @Test
    @DisplayName("제품 정보 정정 요청은 화면 경로 대신 대상 제품을 저장한다")
    void storesProductCorrectionTarget() throws Exception {
        JsonNode document = storedDocumentOf(
            new Feedback(
                ID,
                new ProductCorrection(1L, "블랙 스네일 토너"),
                new FeedbackContent("전성분 표기가 실제 패키지와 달라요."),
                RECEIVED_AT
            )
        );

        assertThat(document.get("type").asText()).isEqualTo("PRODUCT_CORRECTION");
        assertThat(document.get("productId").asLong()).isEqualTo(1L);
        assertThat(document.get("productName").asText()).isEqualTo("블랙 스네일 토너");
        assertThat(document.has("path")).isFalse();
    }

    private JsonNode storedDocumentOf(Feedback feedback) throws Exception {
        repository.save(feedback);

        ArgumentCaptor<RequestBody> bodyCaptor = ArgumentCaptor.forClass(RequestBody.class);
        verify(s3Client).putObject(any(PutObjectRequest.class), bodyCaptor.capture());
        byte[] bytes = bodyCaptor.getValue().contentStreamProvider().newStream().readAllBytes();
        return objectMapper.readTree(new String(bytes, StandardCharsets.UTF_8));
    }

    @Test
    @DisplayName("S3 업로드 실패를 인프라 예외로 변환한다")
    void wrapsS3Failure() {
        given(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
            .willThrow(SdkClientException.create("S3 실패"));
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class)))
            .willReturn(ListObjectsV2Response.builder().contents(java.util.List.of()).build());

        assertThatThrownBy(() -> repository.save(FEEDBACK)).isInstanceOf(InfrastructureException.class);
    }

    @Test
    @DisplayName("Put 응답이 유실돼도 피드백 JSON 키가 있으면 commit 성공으로 확인한다")
    void confirmsCommitAfterLostPutResponse() {
        S3FeedbackRepository.PreparedDocument document = repository.prepare(FEEDBACK);
        given(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
            .willThrow(SdkClientException.create("timeout"));
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class)))
            .willReturn(
                ListObjectsV2Response.builder()
                    .contents(
                        S3Object.builder()
                            .key("poudy/feedback/" + ID + "/feedback.json")
                            .build()
                    )
                    .build()
            );
        assertThat(repository.save(FEEDBACK, document)).isEqualTo(S3FeedbackRepository.SaveStatus.SUCCESS);
    }

    @Test
    @DisplayName("Put과 commit 확인이 모두 실패하면 결과 불명으로 보존한다")
    void keepsUnknownCommitOutcome() {
        S3FeedbackRepository.PreparedDocument document = repository.prepare(FEEDBACK);
        given(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
            .willThrow(SdkClientException.create("timeout"));
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class)))
            .willThrow(SdkClientException.create("access denied"));

        assertThat(repository.save(FEEDBACK, document)).isEqualTo(S3FeedbackRepository.SaveStatus.UNKNOWN);
    }

    @Test
    @DisplayName("이미지를 claim·복사하고 JSON을 저장한 뒤 pending을 소비한다")
    void storesFeedbackWithImages() {
        UUID imageId = UUID.randomUUID();
        FeedbackImage image = new FeedbackImage(imageId, FeedbackImageFormat.PNG);
        S3FeedbackImageRepository.PendingImage pending = new S3FeedbackImageRepository.PendingImage(image, "etag", NOW);
        S3FeedbackImageRepository.Claim claim = new S3FeedbackImageRepository.Claim(ID, List.of(image));
        given(imageRepository.resolve(List.of(imageId), NOW)).willReturn(List.of(pending));
        given(imageRepository.claimAndCopy(eq(ID), eq(List.of(pending)), any())).willReturn(claim);
        given(imageRepository.commit(claim)).willReturn(true);

        Feedback saved = repository.save(FEEDBACK, List.of(imageId), () -> NOW);

        assertThat(saved.images()).containsExactly(image);
        verify(imageRepository).commit(claim);
    }

    @Test
    @DisplayName("피드백 JSON 저장이 확정 실패하면 최종 이미지를 rollback한다")
    void rollsBackImagesAfterDefiniteCommitFailure() {
        UUID imageId = UUID.randomUUID();
        FeedbackImage image = new FeedbackImage(imageId, FeedbackImageFormat.JPEG);
        S3FeedbackImageRepository.PendingImage pending = new S3FeedbackImageRepository.PendingImage(image, "etag", NOW);
        S3FeedbackImageRepository.Claim claim = new S3FeedbackImageRepository.Claim(ID, List.of(image));
        given(imageRepository.resolve(List.of(imageId), NOW)).willReturn(List.of(pending));
        given(imageRepository.claimAndCopy(eq(ID), eq(List.of(pending)), any())).willReturn(claim);
        given(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
            .willThrow(SdkClientException.create("timeout"));
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class)))
            .willReturn(ListObjectsV2Response.builder().contents(List.of()).build());

        assertThatThrownBy(() -> repository.save(FEEDBACK, List.of(imageId), () -> NOW))
            .isInstanceOf(InfrastructureException.class);

        verify(imageRepository).rollback(claim);
    }

    @Test
    @DisplayName("피드백 JSON 저장 결과를 알 수 없으면 claim과 최종 이미지를 보존한다")
    void preservesImagesWhenCommitOutcomeIsUnknown() {
        UUID imageId = UUID.randomUUID();
        FeedbackImage image = new FeedbackImage(imageId, FeedbackImageFormat.PNG);
        S3FeedbackImageRepository.PendingImage pending = new S3FeedbackImageRepository.PendingImage(image, "etag", NOW);
        S3FeedbackImageRepository.Claim claim = new S3FeedbackImageRepository.Claim(ID, List.of(image));
        given(imageRepository.resolve(List.of(imageId), NOW)).willReturn(List.of(pending));
        given(imageRepository.claimAndCopy(eq(ID), eq(List.of(pending)), any())).willReturn(claim);
        given(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
            .willThrow(SdkClientException.create("timeout"));
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class)))
            .willThrow(SdkClientException.create("access denied"));

        assertThatThrownBy(() -> repository.save(FEEDBACK, List.of(imageId), () -> NOW))
            .isInstanceOf(InfrastructureException.class);

        verify(imageRepository, never()).rollback(any());
        verify(imageRepository, never()).commit(any());
    }

    @Test
    @DisplayName("관리 필드가 없는 기존 JSON을 RECEIVED 상태로 읽고 피드백 문서만 목록에 포함한다")
    void readsLegacyDocumentsAndExcludesNonFeedbackObjects() {
        UUID newerId = UUID.fromString("00000000-0000-0000-0000-000000000002");
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class))).willReturn(
            ListObjectsV2Response.builder()
                .contents(
                    S3Object.builder().key("poudy/feedback/" + ID + "/feedback.json").build(),
                    S3Object.builder().key("poudy/feedback/" + newerId + "/feedback.json").build(),
                    S3Object.builder().key("poudy/feedback/pending/" + newerId + ".png").build(),
                    S3Object.builder().key("poudy/feedback/claims/" + newerId + ".json").build(),
                    S3Object.builder().key("poudy/feedback/" + newerId + "/images/image.png").build()
                )
                .build()
        );
        given(s3Client.getObjectAsBytes(any(GetObjectRequest.class))).willAnswer(invocation -> {
            String key = invocation.getArgument(0, GetObjectRequest.class).key();
            if (key.endsWith("/management.json")) {
                throw software.amazon.awssdk.services.s3.model.S3Exception.builder().statusCode(404).build();
            }
            String body = key.contains(newerId.toString())
                ? legacyDocument(newerId, "2026-08-24T12:34:56Z", "BUG_REPORT")
                : legacyDocument(ID, "2026-08-23T12:34:56Z", "OTHER");
            return ResponseBytes.fromByteArray(
                GetObjectResponse.builder().eTag("etag-" + key).build(),
                body.getBytes(StandardCharsets.UTF_8)
            );
        });

        List<Feedback> feedbacks = repository.findAll(FeedbackStatus.RECEIVED, FeedbackSubjectType.BUG_REPORT);

        assertThat(feedbacks).singleElement().satisfies(item -> {
            assertThat(item.id()).isEqualTo(newerId);
            assertThat(item.status()).isEqualTo(FeedbackStatus.RECEIVED);
            assertThat(item.statusChangedAt()).isEqualTo(OffsetDateTime.parse("2026-08-24T12:34:56Z"));
        });
    }

    @Test
    @DisplayName("상태 변경은 피드백 원본 대신 별도 관리 문서에 저장한다")
    void storesStatusInManagementDocument() throws Exception {
        Feedback changed = FEEDBACK.changeStatus(
            FeedbackStatus.COMPLETED,
            Clock.fixed(Instant.parse("2026-09-15T10:00:00Z"), ZoneOffset.UTC)
        );
        repository.updateStatus(changed);

        ArgumentCaptor<PutObjectRequest> request = ArgumentCaptor.forClass(PutObjectRequest.class);
        ArgumentCaptor<RequestBody> body = ArgumentCaptor.forClass(RequestBody.class);
        verify(s3Client).putObject(request.capture(), body.capture());
        assertThat(request.getValue().key()).isEqualTo("poudy/feedback/" + ID + "/management.json");
        assertThat(request.getValue().ifNoneMatch()).isNull();
        assertThat(request.getValue().serverSideEncryption()).isEqualTo(ServerSideEncryption.AES256);

        JsonNode document = objectMapper.readTree(
            body.getValue().contentStreamProvider().newStream().readAllBytes()
        );
        assertThat(document.get("status").asText()).isEqualTo("COMPLETED");
        assertThat(OffsetDateTime.parse(document.get("statusChangedAt").asText()))
            .isEqualTo(OffsetDateTime.parse("2026-09-15T10:00:00Z"));
        assertThat(OffsetDateTime.parse(document.get("completedAt").asText()))
            .isEqualTo(OffsetDateTime.parse("2026-09-15T10:00:00Z"));
        assertThat(changed.completedAt()).isEqualTo(OffsetDateTime.parse("2026-09-15T10:00:00Z"));
    }

    @Test
    @DisplayName("별도 관리 문서의 완료 상태와 처리 시각을 피드백에 결합한다")
    void readsManagementDocument() {
        given(s3Client.getObjectAsBytes(any(GetObjectRequest.class))).willAnswer(invocation -> {
            String key = invocation.getArgument(0, GetObjectRequest.class).key();
            String body = key.endsWith("/management.json")
                ? """
                    {"status":"COMPLETED","statusChangedAt":"2026-09-15T10:00:00Z","completedAt":"2026-09-15T10:00:00Z"}
                    """
                : legacyDocument(ID, "2026-08-23T12:34:56Z", "OTHER");
            return ResponseBytes.fromByteArray(
                GetObjectResponse.builder().build(),
                body.getBytes(StandardCharsets.UTF_8)
            );
        });

        Feedback feedback = repository.findById(ID);

        assertThat(feedback.status()).isEqualTo(FeedbackStatus.COMPLETED);
        assertThat(feedback.statusChangedAt()).isEqualTo(OffsetDateTime.parse("2026-09-15T10:00:00Z"));
        assertThat(feedback.completedAt()).isEqualTo(OffsetDateTime.parse("2026-09-15T10:00:00Z"));
    }

    @Test
    @DisplayName("제품 정보 정정 요청 문서를 대상 제품과 함께 복원한다")
    void readsProductCorrectionDocument() {
        String document = """
            {
              "feedbackId":"%s",
              "type":"PRODUCT_CORRECTION",
              "content":"전성분 표기가 실제 패키지와 달라요.",
              "productId":1,
              "productName":"블랙 스네일 토너",
              "receivedAt":"2026-08-23T12:34:56Z",
              "images":[]
            }
            """.formatted(ID);
        given(s3Client.getObjectAsBytes(any(GetObjectRequest.class))).willAnswer(invocation -> {
            String key = invocation.getArgument(0, GetObjectRequest.class).key();
            if (key.endsWith("/management.json")) {
                throw software.amazon.awssdk.services.s3.model.S3Exception.builder().statusCode(404).build();
            }
            return ResponseBytes.fromByteArray(
                GetObjectResponse.builder().build(),
                document.getBytes(StandardCharsets.UTF_8)
            );
        });

        Feedback feedback = repository.findById(ID);

        assertThat(feedback.subject()).isEqualTo(new ProductCorrection(1L, "블랙 스네일 토너"));
        assertThat(feedback.type()).isEqualTo(FeedbackSubjectType.PRODUCT_CORRECTION);
    }

    private static String legacyDocument(UUID id, String receivedAt, String type) {
        return """
            {
              "feedbackId":"%s",
              "type":"%s",
              "content":"충분히 긴 기존 피드백 내용입니다.",
              "path":"/products/1",
              "receivedAt":"%s",
              "images":[]
            }
            """.formatted(id, type, receivedAt);
    }
}
