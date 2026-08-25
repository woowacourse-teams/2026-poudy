package com.poudy.infrastructure.discord;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@DisplayName("RestClient Discord webhook 전송")
class RestClientDiscordWebhookTransportTest {

    @Test
    @DisplayName("오류 상태도 전송 결과로 반환해 기능별 정책이 판정하게 한다")
    void returnsErrorStatus() throws Exception {
        HttpServer server = serverResponding(400);
        server.start();

        try {
            RestClientDiscordWebhookTransport transport = transport(Duration.ofSeconds(1));

            int status = transport.post(uriOf(server), "{}");

            assertThat(status).isEqualTo(400);
        } finally {
            server.stop(0);
        }
    }

    @Test
    @DisplayName("연결 시간과 별도로 응답 읽기 제한을 적용한다")
    void appliesReadTimeoutSeparately() throws Exception {
        CountDownLatch releaseResponse = new CountDownLatch(1);
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/webhook", exchange -> {
            try {
                releaseResponse.await();
                exchange.sendResponseHeaders(204, -1);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
            } finally {
                exchange.close();
            }
        });
        server.start();

        try {
            RestClientDiscordWebhookTransport transport = transport(Duration.ofMillis(50));

            assertThatThrownBy(() -> transport.post(uriOf(server), "{}"))
                    .isInstanceOf(DiscordWebhookException.class)
                    .extracting(exception -> ((DiscordWebhookException) exception).failure())
                    .isEqualTo(DiscordWebhookException.Failure.TRANSPORT);
        } finally {
            releaseResponse.countDown();
            server.stop(0);
        }
    }

    private static HttpServer serverResponding(int status) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/webhook", exchange -> {
            exchange.sendResponseHeaders(status, -1);
            exchange.close();
        });
        return server;
    }

    private static RestClientDiscordWebhookTransport transport(Duration readTimeout) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(1));
        requestFactory.setReadTimeout(readTimeout);
        RestClient restClient = RestClient.builder().requestFactory(requestFactory).build();
        return new RestClientDiscordWebhookTransport(restClient);
    }

    private static URI uriOf(HttpServer server) {
        return URI.create("http://localhost:" + server.getAddress().getPort() + "/webhook");
    }
}
