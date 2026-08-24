package com.poudy.feedback.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.poudy.exception.InfrastructureException;
import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackContent;
import com.poudy.feedback.domain.FeedbackPath;
import com.poudy.feedback.domain.FeedbackType;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

@DisplayName("S3 의견 저장소")
class S3FeedbackRepositoryTest {

    private static final String BUCKET = "poudy-bucket";
    private static final UUID ID = UUID.fromString("6cacd90d-880d-4a6c-a921-7fb0a85b80d3");
    private static final Feedback FEEDBACK = new Feedback(
            ID,
            FeedbackType.DATA_CORRECTION,
            new FeedbackContent("제품 정보가 실제 패키지와 달라요."),
            new FeedbackPath("/products/12345"),
            OffsetDateTime.parse("2026-08-23T16:20:30+09:00"));

    private final S3Client s3Client = mock(S3Client.class);
    private final ObjectMapper objectMapper = JsonMapper.builder().build();
    private final S3FeedbackRepository repository = new S3FeedbackRepository(s3Client, objectMapper, BUCKET);

    @Test
    @DisplayName("접수 ID를 객체 키로 사용해 UTF-8 JSON을 저장한다")
    void storesFeedbackAsJson() throws Exception {
        repository.save(FEEDBACK);

        ArgumentCaptor<PutObjectRequest> requestCaptor = ArgumentCaptor.forClass(PutObjectRequest.class);
        ArgumentCaptor<RequestBody> bodyCaptor = ArgumentCaptor.forClass(RequestBody.class);
        verify(s3Client).putObject(requestCaptor.capture(), bodyCaptor.capture());

        PutObjectRequest request = requestCaptor.getValue();
        assertThat(request.bucket()).isEqualTo(BUCKET);
        assertThat(request.key()).isEqualTo("poudy/feedback/" + ID + ".json");
        assertThat(request.contentType()).isEqualTo("application/json; charset=UTF-8");

        byte[] bytes = bodyCaptor.getValue().contentStreamProvider().newStream().readAllBytes();
        JsonNode document = objectMapper.readTree(new String(bytes, StandardCharsets.UTF_8));
        assertThat(document.get("feedbackId").asText()).isEqualTo(ID.toString());
        assertThat(document.get("type").asText()).isEqualTo("DATA_CORRECTION");
        assertThat(document.get("content").asText()).isEqualTo("제품 정보가 실제 패키지와 달라요.");
        assertThat(document.get("path").asText()).isEqualTo("/products/12345");
        assertThat(document.get("receivedAt").asText()).isEqualTo("2026-08-23T16:20:30+09:00");
    }

    @Test
    @DisplayName("S3 업로드 실패를 인프라 예외로 변환한다")
    void wrapsS3Failure() {
        given(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .willThrow(SdkClientException.create("S3 실패"));

        assertThatThrownBy(() -> repository.save(FEEDBACK)).isInstanceOf(InfrastructureException.class);
    }
}
