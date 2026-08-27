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
import com.poudy.feedback.domain.FeedbackType;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.OffsetDateTime;
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
    private static final Feedback FEEDBACK = new Feedback(
        ID,
        FeedbackType.DATA_CORRECTION,
        new FeedbackContent("제품 정보가 실제 패키지와 달라요."),
        new FeedbackPath("/products/12345"),
        OffsetDateTime.parse("2026-08-23T16:20:30+09:00")
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
        assertThat(document.get("type").asText()).isEqualTo("DATA_CORRECTION");
        assertThat(document.get("content").asText()).isEqualTo("제품 정보가 실제 패키지와 달라요.");
        assertThat(document.get("path").asText()).isEqualTo("/products/12345");
        assertThat(document.get("receivedAt").asText()).isEqualTo("2026-08-23T16:20:30+09:00");
        assertThat(document.get("images").isArray()).isTrue();
        assertThat(document.get("images").isEmpty()).isTrue();
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
    @DisplayName("Put 응답이 유실돼도 저장된 JSON hash가 같으면 commit 성공으로 확인한다")
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
        given(s3Client.getObjectAsBytes(any(GetObjectRequest.class)))
            .willReturn(
                ResponseBytes.fromByteArray(
                    GetObjectResponse.builder().build(),
                    document.bytes()
                )
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
        given(imageRepository.claimAndCopy(eq(ID), eq(List.of(pending)), any(), any())).willReturn(claim);
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
        given(imageRepository.claimAndCopy(eq(ID), eq(List.of(pending)), any(), any())).willReturn(claim);
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
        given(imageRepository.claimAndCopy(eq(ID), eq(List.of(pending)), any(), any())).willReturn(claim);
        given(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
            .willThrow(SdkClientException.create("timeout"));
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class)))
            .willThrow(SdkClientException.create("access denied"));

        assertThatThrownBy(() -> repository.save(FEEDBACK, List.of(imageId), () -> NOW))
            .isInstanceOf(InfrastructureException.class);

        verify(imageRepository, never()).rollback(any());
        verify(imageRepository, never()).commit(any());
    }
}
