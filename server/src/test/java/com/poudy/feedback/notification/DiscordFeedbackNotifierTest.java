package com.poudy.feedback.notification;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackContent;
import com.poudy.feedback.domain.FeedbackPath;
import com.poudy.feedback.domain.FeedbackSubject;
import com.poudy.feedback.domain.FeedbackType;
import com.poudy.feedback.domain.ProductCorrection;
import com.poudy.feedback.domain.ServiceFeedback;
import com.poudy.feedback.domain.image.FeedbackImage;
import com.poudy.feedback.domain.image.FeedbackImageFormat;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
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

    private static final UUID ID = UUID.fromString("6cacd90d-880d-4a6c-a921-7fb0a85b80d3");
    private static final OffsetDateTime RECEIVED_AT = OffsetDateTime.parse("2026-08-23T16:20:30+09:00");

    private final ObjectMapper objectMapper = JsonMapper.builder().build();

    @Test
    @DisplayName("첨부 개수를 알리고 멘션과 Discord 길이를 제한한다")
    void sendsNotificationWithoutMentions() throws Exception {
        Feedback feedback = new Feedback(
            ID,
            new ServiceFeedback(FeedbackType.BUG_REPORT, FeedbackPath.from("/products?include=123")),
            new FeedbackContent("@everyone " + "가".repeat(1990)),
            RECEIVED_AT,
            List.of(
                new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.JPEG),
                new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.PNG)
            )
        );

        JsonNode payload = send(feedback);

        String message = payload.get("content").asText();
        assertThat(message)
            .contains("기능이 제대로 작동하지 않아요", "화면: /products?include=123", "첨부 이미지: 2장", "@everyone");
        assertThat(message.codePointCount(0, message.length())).isLessThanOrEqualTo(2000);
        assertThat(payload.get("allowed_mentions").get("parse").size()).isZero();
    }

    @Test
    @DisplayName("화면 경로를 모르면 알 수 없음으로 알린다")
    void marksUnknownPath() throws Exception {
        JsonNode payload = send(feedbackOf(new ServiceFeedback(FeedbackType.OTHER, FeedbackPath.from(null))));

        assertThat(payload.get("content").asText()).contains("화면: 알 수 없음");
    }

    @Test
    @DisplayName("제품 정보 정정 요청은 대상 제품을 알린다")
    void notifiesProductCorrectionTarget() throws Exception {
        JsonNode payload = send(feedbackOf(new ProductCorrection(1L, "블랙 스네일 토너")));

        assertThat(payload.get("content").asText())
            .contains("유형: 제품 정보 정정", "제품: 블랙 스네일 토너 (ID 1)")
            .doesNotContain("화면:");
    }

    private static Feedback feedbackOf(FeedbackSubject subject) {
        return new Feedback(ID, subject, new FeedbackContent("충분히 긴 의견 내용입니다."), RECEIVED_AT);
    }

    private JsonNode send(Feedback feedback) throws IOException {
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
            new DiscordFeedbackNotifier(RestClient.builder().build(), webhookUrl).notify(feedback);
        } finally {
            server.stop(0);
        }

        assertThat(query.get()).isEqualTo("wait=true");
        return objectMapper.readTree(requestBody.get());
    }
}
