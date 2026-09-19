package com.poudy.feedback.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.feedback.domain.FeedbackStatus;
import com.poudy.feedback.domain.ProductCorrection;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.S3Object;
import tools.jackson.databind.json.JsonMapper;

@DisplayName("기존 S3 의견 reader")
class LegacyFeedbackS3ReaderTest {

    private static final UUID FEEDBACK_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID IMAGE_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");

    private final S3Client s3Client = mock(S3Client.class);
    private final LegacyFeedbackS3Reader reader = new LegacyFeedbackS3Reader(
        new S3FeedbackObjectStore(s3Client, "feedback-bucket"),
        JsonMapper.builder().build()
    );

    @Test
    @DisplayName("정정 대상, 이미지 메타데이터와 관리 상태를 보존한다")
    void preservesDocumentAndManagementState() {
        String prefix = "poudy/feedback/" + FEEDBACK_ID;
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class))).willReturn(
            ListObjectsV2Response.builder()
                .contents(
                    S3Object.builder().key(prefix + "/feedback.json").build(),
                    S3Object.builder().key(prefix + "/management.json").build()
                )
                .build()
        );
        given(s3Client.getObjectAsBytes(any(GetObjectRequest.class))).willAnswer(invocation -> {
            String key = invocation.<GetObjectRequest>getArgument(0).key();
            String json = key.endsWith("management.json")
                ? """
                    {"status":"COMPLETED","statusChangedAt":"2026-01-03T03:04:05Z","completedAt":"2026-01-03T03:04:05Z"}
                    """
                : """
                    {"feedbackId":"%s","type":"PRODUCT_CORRECTION","productId":1,"productName":"토너","content":"제품 표기를 정확하게 고쳐 주세요.","receivedAt":"2026-01-02T03:04:05Z","images":[{"imageId":"%s","extension":"png"}]}
                    """
                    .formatted(FEEDBACK_ID, IMAGE_ID);
            return ResponseBytes.fromByteArray(
                GetObjectResponse.builder().build(),
                json.getBytes(StandardCharsets.UTF_8)
            );
        });

        var feedback = reader.findAll().getFirst();

        assertThat(feedback.id()).isEqualTo(FEEDBACK_ID);
        assertThat(feedback.subject()).isEqualTo(new ProductCorrection(1L, "토너"));
        assertThat(feedback.images()).singleElement().satisfies(image -> assertThat(image.id()).isEqualTo(IMAGE_ID));
        assertThat(feedback.status()).isEqualTo(FeedbackStatus.COMPLETED);
        assertThat(feedback.completedAt()).isEqualTo(OffsetDateTime.parse("2026-01-03T03:04:05Z"));
    }
}
