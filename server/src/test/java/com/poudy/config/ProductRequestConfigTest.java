package com.poudy.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.s3.S3Client;

@DisplayName("제품 등록 요청 외부 클라이언트 설정")
class ProductRequestConfigTest {

    @Test
    @DisplayName("S3 전체 호출과 개별 시도를 프록시 제한보다 짧게 제한한다")
    void configuresS3Timeouts() {
        ProductRequestConfig config = new ProductRequestConfig();

        try (S3Client client = config.productRequestS3Client("ap-northeast-2")) {
            assertThat(client.serviceClientConfiguration().overrideConfiguration().apiCallTimeout())
                .contains(ProductRequestConfig.S3_API_CALL_TIMEOUT);
            assertThat(client.serviceClientConfiguration().overrideConfiguration().apiCallAttemptTimeout())
                .contains(ProductRequestConfig.S3_API_CALL_ATTEMPT_TIMEOUT);
        }
    }
}
