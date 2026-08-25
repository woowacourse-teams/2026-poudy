package com.poudy.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.s3.S3Client;

@DisplayName("제품 등록 요청 외부 클라이언트 설정")
class ProductRequestConfigTest {

    @Test
    @DisplayName("Discord 연결과 전체 요청을 각각 기존 시간으로 제한한다")
    void configuresDiscordTimeouts() {
        ProductRequestConfig config = new ProductRequestConfig();

        assertThat(ProductRequestConfig.DISCORD_CONNECT_TIMEOUT).isEqualTo(Duration.ofSeconds(3));
        assertThat(ProductRequestConfig.DISCORD_REQUEST_TIMEOUT).isEqualTo(Duration.ofSeconds(5));
        assertThat(config.productRequestHttpClient().connectTimeout())
                .contains(ProductRequestConfig.DISCORD_CONNECT_TIMEOUT);
    }

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
