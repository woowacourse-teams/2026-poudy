package com.poudy.productrequest.notification;

import com.poudy.exception.InfrastructureException;
import com.poudy.infrastructure.discord.DiscordWebhookClient;
import com.poudy.infrastructure.discord.DiscordWebhookException;
import com.poudy.productrequest.domain.ProductRequest;
import java.net.URI;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class DiscordProductRequestNotifier {

    private final DiscordWebhookClient webhookClient;
    private final String webhookUrl;

    public DiscordProductRequestNotifier(
            @Qualifier("productRequestDiscordWebhookClient") DiscordWebhookClient webhookClient,
            @Value("${poudy.product-request.discord.webhook-url:}") String webhookUrl) {
        this.webhookClient = webhookClient;
        this.webhookUrl = webhookUrl.trim();
    }

    public void notify(ProductRequest request) {
        if (!StringUtils.hasText(webhookUrl)) {
            throw new InfrastructureException("제품 등록 요청 Discord webhook이 설정되지 않았습니다.");
        }

        try {
            int status = webhookClient.post(URI.create(webhookUrl), payload(request));
            if (status < 200 || status >= 300) {
                throw new InfrastructureException(
                        "제품 등록 요청 Discord 알림이 실패했습니다. status=" + status);
            }
        } catch (DiscordWebhookException exception) {
            throw notificationFailure(exception);
        }
    }

    private static Map<String, Object> payload(ProductRequest request) {
        String brandLine = request.brandName() == null ? "" : "\n브랜드명: " + request.brandName();
        return Map.of(
                "content",
                "신규 제품 등록 요청\n제품명: " + request.productName() + brandLine,
                "allowed_mentions",
                Map.of("parse", List.of()));
    }

    private static InfrastructureException notificationFailure(DiscordWebhookException exception) {
        return switch (exception.failure()) {
            case JSON_SERIALIZATION ->
                new InfrastructureException("제품 등록 요청 Discord 알림 JSON을 만들지 못했습니다.");
            case INTERRUPTED -> new InfrastructureException("제품 등록 요청 Discord 알림이 중단되었습니다.");
            case TRANSPORT -> new InfrastructureException(
                    "제품 등록 요청 Discord 알림을 전송하지 못했습니다. cause=" + exception.causeType());
        };
    }
}
