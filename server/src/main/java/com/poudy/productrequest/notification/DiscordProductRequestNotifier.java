package com.poudy.productrequest.notification;

import com.poudy.exception.InfrastructureException;
import com.poudy.productrequest.domain.ProductRequest;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Component
public class DiscordProductRequestNotifier {

    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(5);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String webhookUrl;

    public DiscordProductRequestNotifier(
            HttpClient httpClient,
            ObjectMapper objectMapper,
            @Value("${poudy.product-request.discord.webhook-url:}") String webhookUrl) {
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
        this.webhookUrl = webhookUrl.trim();
    }

    public void notify(ProductRequest request) {
        if (!StringUtils.hasText(webhookUrl)) {
            throw new InfrastructureException("제품 등록 요청 Discord webhook이 설정되지 않았습니다.");
        }

        HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(webhookUrl))
                .timeout(REQUEST_TIMEOUT)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload(request)))
                .build();

        try {
            HttpResponse<Void> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.discarding());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new InfrastructureException(
                        "제품 등록 요청 Discord 알림이 실패했습니다. status=" + response.statusCode());
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new InfrastructureException("제품 등록 요청 Discord 알림이 중단되었습니다.");
        } catch (IOException exception) {
            throw new InfrastructureException(
                    "제품 등록 요청 Discord 알림을 전송하지 못했습니다. cause="
                            + exception.getClass().getSimpleName());
        }
    }

    private String payload(ProductRequest request) {
        String brandLine = request.brandName() == null ? "" : "\n브랜드명: " + request.brandName();
        Map<String, Object> payload = Map.of(
                "content",
                "신규 제품 등록 요청\n제품명: " + request.productName() + brandLine,
                "allowed_mentions",
                Map.of("parse", List.of()));

        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JacksonException exception) {
            throw new InfrastructureException("제품 등록 요청 Discord 알림 JSON을 만들지 못했습니다.");
        }
    }
}
