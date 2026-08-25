package com.poudy.infrastructure.discord;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

@DisplayName("JDK Discord webhook 전송")
class JdkDiscordWebhookTransportTest {

    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(5);

    private final HttpClient httpClient = mock(HttpClient.class);
    private final HttpResponse<Void> response = mock();
    private final JdkDiscordWebhookTransport transport = new JdkDiscordWebhookTransport(httpClient, REQUEST_TIMEOUT);

    @Test
    @DisplayName("전체 요청 제한 시간 안에서 JSON을 POST하고 상태를 반환한다")
    void postsWithRequestTimeout() throws Exception {
        given(response.statusCode()).willReturn(204);
        given(httpClient.send(any(HttpRequest.class), anyDiscardingHandler())).willReturn(response);

        int status = transport.post(URI.create("https://discord.example/webhook"), "{}");

        assertThat(status).isEqualTo(204);
        ArgumentCaptor<HttpRequest> request = ArgumentCaptor.forClass(HttpRequest.class);
        verify(httpClient).send(request.capture(), anyDiscardingHandler());
        assertThat(request.getValue().method()).isEqualTo("POST");
        assertThat(request.getValue().timeout()).contains(REQUEST_TIMEOUT);
        assertThat(request.getValue().headers().firstValue("Content-Type")).contains("application/json");
    }

    @Test
    @DisplayName("I/O 실패는 원인 타입만 전달하고 상세 메시지는 노출하지 않는다")
    void hidesTransportFailureDetail() throws Exception {
        given(httpClient.send(any(HttpRequest.class), anyDiscardingHandler()))
                .willThrow(new IOException("https://discord.example/webhook/secret"));

        assertThatThrownBy(() -> transport.post(URI.create("https://discord.example/webhook/secret"), "{}"))
                .isInstanceOf(DiscordWebhookException.class)
                .satisfies(exception -> {
                    DiscordWebhookException failure = (DiscordWebhookException) exception;
                    assertThat(failure.failure()).isEqualTo(DiscordWebhookException.Failure.TRANSPORT);
                    assertThat(failure.causeType()).isEqualTo("IOException");
                    assertThat(failure).hasMessageNotContaining("secret");
                });
    }

    @Test
    @DisplayName("중단된 전송은 인터럽트 상태를 복구한다")
    void restoresInterruptedStatus() throws Exception {
        given(httpClient.send(any(HttpRequest.class), anyDiscardingHandler()))
                .willThrow(new InterruptedException("interrupted"));

        try {
            assertThatThrownBy(() -> transport.post(URI.create("https://discord.example/webhook"), "{}"))
                    .isInstanceOf(DiscordWebhookException.class)
                    .extracting(exception -> ((DiscordWebhookException) exception).failure())
                    .isEqualTo(DiscordWebhookException.Failure.INTERRUPTED);
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
        } finally {
            Thread.interrupted();
        }
    }

    @SuppressWarnings("unchecked")
    private static HttpResponse.BodyHandler<Void> anyDiscardingHandler() {
        return any(HttpResponse.BodyHandler.class);
    }
}
