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
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import tools.jackson.databind.ObjectMapper;

@DisplayName("S3 제품 등록 요청 저장소")
class S3ProductRequestRepositoryTest {

    private final S3Client s3Client = mock(S3Client.class);
    private final ObjectMapper objectMapper = mock(ObjectMapper.class);

    @Test
    @DisplayName("요청마다 prefix 아래 서로 다른 JSON 객체를 저장한다")
    void storesEachRequestAsUniqueJsonObject() {
        given(objectMapper.writeValueAsString(any(ProductRequest.class))).willReturn("{}");
        S3ProductRequestRepository repository = new S3ProductRequestRepository(
                s3Client,
                objectMapper,
                "requests-bucket",
                "/incoming/product-requests/");
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
                        "incoming/product-requests/00000000-0000-0000-0000-000000000002.json");
    }

    @Test
    @DisplayName("S3 저장 실패를 인프라 예외로 변환한다")
    void wrapsS3Failure() {
        given(objectMapper.writeValueAsString(any(ProductRequest.class))).willReturn("{}");
        given(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .willThrow(S3Exception.builder().message("secret detail").build());
        S3ProductRequestRepository repository = new S3ProductRequestRepository(
                s3Client,
                objectMapper,
                "requests-bucket",
                "requests");

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

    private static ProductRequest request(String id) {
        return new ProductRequest(
                1,
                UUID.fromString(id),
                "제품",
                "브랜드",
                OffsetDateTime.parse("2026-08-23T12:34:56Z"));
    }
}
