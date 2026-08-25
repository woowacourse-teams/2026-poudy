package com.poudy.feedback.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.exception.InfrastructureException;
import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackContent;
import com.poudy.feedback.domain.FeedbackPath;
import com.poudy.feedback.domain.FeedbackType;
import com.poudy.infrastructure.discord.DiscordWebhookClient;
import com.poudy.infrastructure.discord.RestClientDiscordWebhookTransport;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

@DisplayName("Discord 의견 알림")
class DiscordFeedbackNotifierTest {

    private final ObjectMapper objectMapper = JsonMapper.builder().build();

    @Test
    @DisplayName("멘션을 차단하고 Discord 길이 안에서 의견을 알린다")
    void sendsNotificationWithoutMentions() throws Exception {
        AtomicReference<String> query = new AtomicReference<>();
        AtomicReference<String> requestBody = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/webhook", exchange -> {
            query.set(exchange.getRequestURI().getQuery());
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] response = "{}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        server.start();

        try {
            String webhookUrl = "http://localhost:" + server.getAddress().getPort() + "/webhook";
            SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
            requestFactory.setConnectTimeout(Duration.ofSeconds(2));
            requestFactory.setReadTimeout(Duration.ofSeconds(3));
            DiscordWebhookClient webhookClient = new DiscordWebhookClient(
                    new RestClientDiscordWebhookTransport(
                            RestClient.builder().requestFactory(requestFactory).build()),
                    objectMapper);
            DiscordFeedbackNotifier notifier = new DiscordFeedbackNotifier(webhookClient, webhookUrl);
            Feedback feedback = feedback("@everyone " + "가".repeat(1990));

            notifier.notify(feedback);

            JsonNode payload = objectMapper.readTree(requestBody.get());
            String message = payload.get("content").asText();
            assertThat(query.get()).isEqualTo("wait=true");
            assertThat(message).contains("정보가 잘못됐어요", "/products/12345", "@everyone");
            assertThat(message.codePointCount(0, message.length())).isLessThanOrEqualTo(2000);
            assertThat(payload.get("allowed_mentions").get("parse").size()).isZero();
        } finally {
            server.stop(0);
        }
    }

    @Test
    @DisplayName("Discord 리다이렉션 응답은 성공으로 처리한다")
    void acceptsRedirectResponse() {
        DiscordWebhookClient webhookClient = mock(DiscordWebhookClient.class);
        given(webhookClient.post(any(URI.class), any())).willReturn(302);

        new DiscordFeedbackNotifier(webhookClient, "https://discord.example/webhook")
                .notify(feedback("유효한 사용자 의견입니다"));
    }

    @Test
    @DisplayName("Discord 4xx와 5xx 응답은 실패로 처리한다")
    void rejectsErrorResponse() {
        DiscordWebhookClient webhookClient = mock(DiscordWebhookClient.class);
        given(webhookClient.post(any(URI.class), any())).willReturn(400);

        assertThatThrownBy(
                () -> new DiscordFeedbackNotifier(webhookClient, "https://discord.example/webhook")
                        .notify(feedback("유효한 사용자 의견입니다")))
                .isInstanceOf(InfrastructureException.class)
                .hasMessage("Discord 의견 알림 전송에 실패했습니다. status=400");
    }

    private static Feedback feedback(String content) {
        return new Feedback(
                UUID.fromString("6cacd90d-880d-4a6c-a921-7fb0a85b80d3"),
                FeedbackType.DATA_CORRECTION,
                new FeedbackContent(content),
                new FeedbackPath("/products/12345"),
                OffsetDateTime.parse("2026-08-23T16:20:30+09:00"));
    }
}
