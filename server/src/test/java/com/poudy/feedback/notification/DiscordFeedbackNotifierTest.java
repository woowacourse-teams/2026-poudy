package com.poudy.feedback.notification;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackContent;
import com.poudy.feedback.domain.FeedbackImage;
import com.poudy.feedback.domain.FeedbackImageFormat;
import com.poudy.feedback.domain.FeedbackPath;
import com.poudy.feedback.domain.FeedbackType;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

@DisplayName("Discord 의견 알림")
class DiscordFeedbackNotifierTest {

    private final ObjectMapper objectMapper = JsonMapper.builder().build();

    @Test
    @DisplayName("첨부 개수를 알리고 멘션과 Discord 길이를 제한한다")
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
            DiscordFeedbackNotifier notifier = new DiscordFeedbackNotifier(RestClient.builder().build(), webhookUrl);
            Feedback feedback = new Feedback(
                    UUID.fromString("6cacd90d-880d-4a6c-a921-7fb0a85b80d3"),
                    FeedbackType.DATA_CORRECTION,
                    new FeedbackContent("@everyone " + "가".repeat(1990)),
                    new FeedbackPath("/products/12345"),
                    OffsetDateTime.parse("2026-08-23T16:20:30+09:00"),
                    List.of(
                            new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.JPEG),
                            new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.PNG)));

            notifier.notify(feedback);

            JsonNode payload = objectMapper.readTree(requestBody.get());
            String message = payload.get("content").asText();
            assertThat(query.get()).isEqualTo("wait=true");
            assertThat(message).contains("정보가 잘못됐어요", "/products/12345", "첨부 이미지: 2장", "@everyone");
            assertThat(message.codePointCount(0, message.length())).isLessThanOrEqualTo(2000);
            assertThat(payload.get("allowed_mentions").get("parse").size()).isZero();
        } finally {
            server.stop(0);
        }
    }
}
