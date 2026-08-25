package com.poudy.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.s3.S3Client;

@DisplayName("의견 등록 외부 클라이언트 설정")
class FeedbackConfigTest {

    @Test
    @DisplayName("Discord 연결과 응답 읽기를 각각 기존 시간으로 제한한다")
    void configuresDiscordTimeouts() {
        assertThat(FeedbackConfig.DISCORD_CONNECT_TIMEOUT).isEqualTo(Duration.ofSeconds(2));
        assertThat(FeedbackConfig.DISCORD_READ_TIMEOUT).isEqualTo(Duration.ofSeconds(3));
        assertThat(new FeedbackConfig().feedbackDiscordRestClient()).isNotNull();
    }

    @Test
    @DisplayName("S3 전체 호출과 개별 시도를 프록시 제한보다 짧게 제한한다")
    void configuresS3Timeouts() {
        FeedbackConfig config = new FeedbackConfig();

        try (S3Client client = config.feedbackS3Client("ap-northeast-2")) {
            assertThat(client.serviceClientConfiguration().overrideConfiguration().apiCallTimeout())
                    .contains(FeedbackConfig.S3_API_CALL_TIMEOUT);
            assertThat(client.serviceClientConfiguration().overrideConfiguration().apiCallAttemptTimeout())
                    .contains(FeedbackConfig.S3_API_CALL_ATTEMPT_TIMEOUT);
        }
    }
}
