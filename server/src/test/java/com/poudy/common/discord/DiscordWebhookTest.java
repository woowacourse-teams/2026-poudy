package com.poudy.common.discord;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.exception.InfrastructureException;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@DisplayName("Discord webhook 전송")
class DiscordWebhookTest {

    private final DiscordWebhook webhook = new DiscordWebhook();
    private final AtomicReference<String> query = new AtomicReference<>();
    private final AtomicReference<String> contentType = new AtomicReference<>();
    private final AtomicReference<String> requestBody = new AtomicReference<>();
    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    @DisplayName("내용을 멘션 없이 전송하고 Discord 가 처리할 때까지 기다린다")
    void sendsContentWithoutMentions() throws IOException {
        String webhookUrl = startServer(200);

        webhook.send(webhookUrl, "@everyone 새 알림");

        JsonNode payload = JsonMapper.builder().build().readTree(requestBody.get());
        assertThat(query.get()).isEqualTo("wait=true");
        assertThat(contentType.get()).startsWith("application/json");
        assertThat(payload.get("content").asText()).isEqualTo("@everyone 새 알림");
        assertThat(payload.get("allowed_mentions").get("parse").size()).isZero();
    }

    @Test
    @DisplayName("성공 응답이 아니면 상태 코드를 담아 실패로 알린다")
    void reportsUnsuccessfulStatus() throws IOException {
        String webhookUrl = startServer(500);

        assertThatThrownBy(() -> webhook.send(webhookUrl, "알림"))
            .isInstanceOf(InfrastructureException.class)
            .hasMessageContaining("status=500")
            .hasMessageNotContaining("secret");
    }

    @Test
    @DisplayName("전송 오류에는 webhook 비밀값을 노출하지 않는다")
    void hidesWebhookFromFailure() {
        assertThatThrownBy(() -> webhook.send("http://localhost:1/webhook/secret", "알림"))
            .isInstanceOf(InfrastructureException.class)
            .hasMessageNotContaining("secret");
    }

    @Test
    @DisplayName("webhook 이 설정되지 않으면 전송하지 않고 실패로 알린다")
    void rejectsMissingWebhook() {
        assertThatThrownBy(() -> webhook.send(" ", "알림"))
            .isInstanceOf(InfrastructureException.class)
            .hasMessageContaining("설정되지 않았습니다");
    }

    private String startServer(int status) throws IOException {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/webhook/secret", exchange -> {
            query.set(exchange.getRequestURI().getQuery());
            contentType.set(exchange.getRequestHeaders().getFirst("Content-Type"));
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            exchange.sendResponseHeaders(status, -1);
            exchange.close();
        });
        server.start();
        return "http://localhost:" + server.getAddress().getPort() + "/webhook/secret";
    }
}
