package com.poudy.productrequest.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.productrequest.domain.ProductRequestStatus;
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

@DisplayName("기존 S3 제품 등록 요청 reader")
class LegacyProductRequestS3ReaderTest {

    private static final UUID V1_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID V2_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");

    private final S3Client s3Client = mock(S3Client.class);
    private final LegacyProductRequestS3Reader reader = new LegacyProductRequestS3Reader(
        s3Client,
        JsonMapper.builder().build(),
        "request-bucket",
        "/product-requests/"
    );

    @Test
    @DisplayName("v1 기본 상태와 v2 관리 상태를 모두 보존한다")
    void readsBothLegacySchemaVersions() {
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class))).willReturn(
            ListObjectsV2Response.builder()
                .contents(
                    S3Object.builder().key("product-requests/" + V1_ID + ".json").build(),
                    S3Object.builder().key("product-requests/" + V2_ID + ".json").build()
                )
                .build()
        );
        given(s3Client.getObjectAsBytes(any(GetObjectRequest.class))).willAnswer(invocation -> {
            String key = invocation.<GetObjectRequest>getArgument(0).key();
            String json = key.contains(V1_ID.toString())
                ? """
                    {"schemaVersion":1,"requestId":"%s","productName":"제품1","brandName":"브랜드","requestedAt":"2026-01-02T03:04:05Z"}
                    """
                    .formatted(V1_ID)
                : """
                    {"schemaVersion":2,"requestId":"%s","productName":"제품2","brandName":null,"requestedAt":"2026-01-02T03:04:05Z","status":"REJECTED","statusChangedAt":"2026-01-03T03:04:05Z","completedAt":null}
                    """
                    .formatted(V2_ID);
            return ResponseBytes.fromByteArray(
                GetObjectResponse.builder().build(),
                json.getBytes(StandardCharsets.UTF_8)
            );
        });

        var requests = reader.findAll();

        assertThat(requests).extracting(request -> request.requestId()).containsExactly(V1_ID, V2_ID);
        assertThat(requests.get(0).status()).isEqualTo(ProductRequestStatus.RECEIVED);
        assertThat(requests.get(0).statusChangedAt()).isEqualTo(OffsetDateTime.parse("2026-01-02T03:04:05Z"));
        assertThat(requests.get(1).status()).isEqualTo(ProductRequestStatus.REJECTED);
        assertThat(requests.get(1).statusChangedAt()).isEqualTo(OffsetDateTime.parse("2026-01-03T03:04:05Z"));
    }
}
