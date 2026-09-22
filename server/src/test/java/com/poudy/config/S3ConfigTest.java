package com.poudy.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.s3.S3Client;

@DisplayName("S3 외부 클라이언트 설정")
class S3ConfigTest {

    private final S3Config config = new S3Config();

    @Test
    @DisplayName("피드백 S3 전체 호출과 개별 시도를 프록시 제한보다 짧게 제한한다")
    void configuresFeedbackS3Timeouts() {
        try (S3Client client = config.feedbackImageS3Client("ap-northeast-2")) {
            assertTimeouts(client);
        }
    }

    private static void assertTimeouts(S3Client client) {
        assertThat(client.serviceClientConfiguration().overrideConfiguration().apiCallTimeout())
            .contains(S3Config.API_CALL_TIMEOUT);
        assertThat(client.serviceClientConfiguration().overrideConfiguration().apiCallAttemptTimeout())
            .contains(S3Config.API_CALL_ATTEMPT_TIMEOUT);
    }
}
