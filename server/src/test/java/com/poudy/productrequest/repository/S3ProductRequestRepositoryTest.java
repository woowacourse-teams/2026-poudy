package com.poudy.productrequest.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.poudy.exception.InfrastructureException;
import com.poudy.productrequest.domain.ProductRequest;
import com.poudy.productrequest.domain.ProductRequestStatus;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.model.S3Object;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

@DisplayName("S3 제품 등록 요청 저장소")
class S3ProductRequestRepositoryTest {

    private final S3Client s3Client = mock(S3Client.class);
    private final ObjectMapper objectMapper = mock(ObjectMapper.class);

    @Test
    @DisplayName("도메인 구현과 무관하게 기존 JSON 문서 계약을 유지한다")
    void preservesJsonDocumentContract() throws Exception {
        ObjectMapper realObjectMapper = JsonMapper.builder().build();
        S3ProductRequestRepository repository = new S3ProductRequestRepository(
            s3Client,
            realObjectMapper,
            "requests-bucket",
            "requests"
        );

        repository.save(request("00000000-0000-0000-0000-000000000001"));

        ArgumentCaptor<RequestBody> body = ArgumentCaptor.forClass(RequestBody.class);
        verify(s3Client).putObject(any(PutObjectRequest.class), body.capture());
        byte[] bytes = body.getValue().contentStreamProvider().newStream().readAllBytes();
        tools.jackson.databind.JsonNode document = realObjectMapper.readTree(
            new String(bytes, StandardCharsets.UTF_8)
        );

        assertThat(document.get("schemaVersion").asInt()).isEqualTo(1);
        assertThat(document.get("requestId").asText()).isEqualTo("00000000-0000-0000-0000-000000000001");
        assertThat(document.get("productName").asText()).isEqualTo("제품");
        assertThat(document.get("brandName").asText()).isEqualTo("브랜드");
        assertThat(document.get("requestedAt").asText()).isEqualTo("2026-08-23T12:34:56Z");
    }

    @Test
    @DisplayName("요청마다 prefix 아래 서로 다른 JSON 객체를 저장한다")
    void storesEachRequestAsUniqueJsonObject() {
        given(objectMapper.writeValueAsString(any())).willReturn("{}");
        S3ProductRequestRepository repository = new S3ProductRequestRepository(
            s3Client,
            objectMapper,
            "requests-bucket",
            "/incoming/product-requests/"
        );
        ProductRequest first = request("00000000-0000-0000-0000-000000000001");
        ProductRequest second = request("00000000-0000-0000-0000-000000000002");

        repository.save(first);
        repository.save(second);

        ArgumentCaptor<PutObjectRequest> puts = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client, times(2)).putObject(puts.capture(), any(RequestBody.class));
        assertThat(puts.getAllValues()).extracting(PutObjectRequest::bucket)
            .containsOnly("requests-bucket");
        assertThat(puts.getAllValues()).extracting(PutObjectRequest::contentType)
            .containsOnly("application/json");
        assertThat(puts.getAllValues()).extracting(PutObjectRequest::key)
            .containsExactly(
                "incoming/product-requests/00000000-0000-0000-0000-000000000001.json",
                "incoming/product-requests/00000000-0000-0000-0000-000000000002.json"
            );
    }

    @Test
    @DisplayName("S3 저장 실패를 인프라 예외로 변환한다")
    void wrapsS3Failure() {
        given(objectMapper.writeValueAsString(any())).willReturn("{}");
        given(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
            .willThrow(S3Exception.builder().message("secret detail").build());
        S3ProductRequestRepository repository = new S3ProductRequestRepository(
            s3Client,
            objectMapper,
            "requests-bucket",
            "requests"
        );

        assertThatThrownBy(() -> repository.save(request("00000000-0000-0000-0000-000000000001")))
            .isInstanceOf(InfrastructureException.class)
            .hasMessage("제품 등록 요청을 S3에 저장하지 못했습니다.");
    }

    @Test
    @DisplayName("버킷이 설정되지 않으면 외부 호출 없이 실패한다")
    void rejectsMissingBucketBeforeExternalCall() {
        S3ProductRequestRepository repository = new S3ProductRequestRepository(s3Client, objectMapper, " ", "requests");

        assertThatThrownBy(() -> repository.save(request("00000000-0000-0000-0000-000000000001")))
            .isInstanceOf(InfrastructureException.class);
        verify(s3Client, times(0)).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    @DisplayName("기존 v1 문서는 관리 필드를 저장하지 않고 RECEIVED 상태로 읽는다")
    void readsV1DocumentWithManagementFallback() {
        ObjectMapper realObjectMapper = JsonMapper.builder().build();
        S3ProductRequestRepository repository = new S3ProductRequestRepository(
            s3Client,
            realObjectMapper,
            "requests-bucket",
            "requests"
        );
        String body = """
            {"schemaVersion":1,"requestId":"00000000-0000-0000-0000-000000000001","productName":"제품","brandName":"브랜드","requestedAt":"2026-08-23T12:34:56Z"}
            """;
        given(s3Client.getObjectAsBytes(any(software.amazon.awssdk.services.s3.model.GetObjectRequest.class)))
            .willReturn(
                software.amazon.awssdk.core.ResponseBytes.fromByteArray(
                    GetObjectResponse.builder().eTag("\"v1\"").build(),
                    body.getBytes(StandardCharsets.UTF_8)
                )
            );

        ProductRequest stored = repository
            .findById(UUID.fromString("00000000-0000-0000-0000-000000000001"));

        assertThat(stored.status()).isEqualTo(ProductRequestStatus.RECEIVED);
        assertThat(stored.statusChangedAt()).isEqualTo(OffsetDateTime.parse("2026-08-23T12:34:56Z"));
    }

    @Test
    @DisplayName("모든 S3 목록 페이지의 문서를 읽어 상태로 필터하고 접수 시각 역순으로 정렬한다")
    void listsAllPagesThenFiltersAndSorts() {
        ObjectMapper realObjectMapper = JsonMapper.builder().build();
        S3ProductRequestRepository repository = new S3ProductRequestRepository(
            s3Client,
            realObjectMapper,
            "requests-bucket",
            "requests"
        );
        String firstKey = "requests/00000000-0000-0000-0000-000000000001.json";
        String secondKey = "requests/00000000-0000-0000-0000-000000000002.json";
        String thirdKey = "requests/00000000-0000-0000-0000-000000000003.json";
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class))).willReturn(
            ListObjectsV2Response.builder()
                .contents(S3Object.builder().key(firstKey).build(), S3Object.builder().key(secondKey).build())
                .nextContinuationToken("next")
                .build(),
            ListObjectsV2Response.builder()
                .contents(
                    S3Object.builder().key(thirdKey).build(),
                    S3Object.builder().key("requests/ignore.txt").build()
                )
                .build()
        );
        given(s3Client.getObjectAsBytes(any(software.amazon.awssdk.services.s3.model.GetObjectRequest.class)))
            .willAnswer(invocation -> {
                String key = invocation.<software.amazon.awssdk.services.s3.model.GetObjectRequest>getArgument(0).key();
                String document = switch (key) {
                    case "requests/00000000-0000-0000-0000-000000000001.json" ->
                        v2("001", "2026-09-15T09:00:00Z", "RECEIVED");
                    case "requests/00000000-0000-0000-0000-000000000002.json" ->
                        v2("002", "2026-09-15T11:00:00Z", "COMPLETED");
                    default -> v2("003", "2026-09-15T10:00:00Z", "COMPLETED");
                };
                return software.amazon.awssdk.core.ResponseBytes.fromByteArray(
                    GetObjectResponse.builder().eTag("\"" + key + "\"").build(),
                    document.getBytes(StandardCharsets.UTF_8)
                );
            });

        List<ProductRequest> requests = repository.findAll(ProductRequestStatus.COMPLETED);

        assertThat(requests).extracting(item -> item.requestId().toString())
            .containsExactly(
                "00000000-0000-0000-0000-000000000002",
                "00000000-0000-0000-0000-000000000003"
            );
        verify(s3Client, times(2)).listObjectsV2(any(ListObjectsV2Request.class));
    }

    @Test
    @DisplayName("상태 갱신은 관리 필드를 포함한 JSON으로 덮어쓴다")
    void updatesStatusFields() throws Exception {
        ObjectMapper realObjectMapper = JsonMapper.builder().build();
        S3ProductRequestRepository repository = new S3ProductRequestRepository(
            s3Client,
            realObjectMapper,
            "requests-bucket",
            "requests"
        );
        OffsetDateTime completedAt = OffsetDateTime.parse("2026-09-15T10:00:00Z");
        ProductRequest completed = new ProductRequest(
            UUID.fromString("00000000-0000-0000-0000-000000000001"),
            "제품",
            "브랜드",
            OffsetDateTime.parse("2026-09-15T09:00:00Z"),
            ProductRequestStatus.COMPLETED,
            completedAt,
            completedAt
        );

        repository.update(completed);

        ArgumentCaptor<RequestBody> body = ArgumentCaptor.forClass(RequestBody.class);
        verify(s3Client).putObject(any(PutObjectRequest.class), body.capture());
        tools.jackson.databind.JsonNode document = realObjectMapper.readTree(
            body.getValue().contentStreamProvider().newStream().readAllBytes()
        );
        assertThat(document.get("schemaVersion").asInt()).isEqualTo(2);
        assertThat(document.get("status").asText()).isEqualTo("COMPLETED");
        assertThat(document.get("statusChangedAt").asText()).isEqualTo("2026-09-15T10:00:00Z");
        assertThat(document.get("completedAt").asText()).isEqualTo("2026-09-15T10:00:00Z");
    }

    @Test
    @DisplayName("상태 갱신 실패를 인프라 예외로 변환한다")
    void wrapsUpdateFailure() {
        given(objectMapper.writeValueAsString(any())).willReturn("{}");
        given(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
            .willThrow(S3Exception.builder().message("secret detail").build());
        S3ProductRequestRepository repository = new S3ProductRequestRepository(
            s3Client,
            objectMapper,
            "requests-bucket",
            "requests"
        );

        assertThatThrownBy(() -> repository.update(request("00000000-0000-0000-0000-000000000001")))
            .isInstanceOf(InfrastructureException.class)
            .hasMessage("제품 등록 요청 상태를 S3에 저장하지 못했습니다.");
    }

    private static ProductRequest request(String id) {
        return new ProductRequest(
            UUID.fromString(id),
            "제품",
            "브랜드",
            OffsetDateTime.parse("2026-08-23T12:34:56Z")
        );
    }

    private static String v2(String shortId, String requestedAt, String status) {
        String completedAt = "COMPLETED".equals(status) ? "\"" + requestedAt + "\"" : "null";
        return """
            {"schemaVersion":2,"requestId":"00000000-0000-0000-0000-000000000%s","productName":"제품","brandName":"브랜드","requestedAt":"%s","status":"%s","statusChangedAt":"%s","completedAt":%s}
            """
            .formatted(shortId, requestedAt, status, requestedAt, completedAt);
    }
}
