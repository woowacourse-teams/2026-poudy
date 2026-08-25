package com.poudy.feedback.notification;

import com.poudy.exception.InfrastructureException;
import com.poudy.feedback.domain.Feedback;
import com.poudy.infrastructure.discord.DiscordWebhookClient;
import java.net.URI;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class DiscordFeedbackNotifier implements FeedbackNotifier {

    private static final int DISCORD_CONTENT_MAX_LENGTH = 2000;
    private static final DateTimeFormatter RECEIVED_AT_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final DiscordWebhookClient webhookClient;
    private final String webhookUrl;

    public DiscordFeedbackNotifier(
            @Qualifier("feedbackDiscordWebhookClient") DiscordWebhookClient webhookClient,
            @Value("${poudy.feedback.discord.webhook-url:}") String webhookUrl) {
        this.webhookClient = webhookClient;
        this.webhookUrl = webhookUrl;
    }

    @Override
    public void notify(Feedback feedback) {
        int status = webhookClient.post(URI.create(webhookUrl + "?wait=true"), payloadOf(feedback));
        if (status >= 400) {
            throw new InfrastructureException("Discord 의견 알림 전송에 실패했습니다. status=" + status);
        }
    }

    private static Map<String, Object> payloadOf(Feedback feedback) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("content", messageOf(feedback));
        payload.put("allowed_mentions", Map.of("parse", List.of()));

        return payload;
    }

    private static String messageOf(Feedback feedback) {
        String header = """
                💬 새로운 사용자 의견

                유형: %s
                화면: %s
                접수 시각: %s
                접수 ID: %s

                """.formatted(
                feedback.type().displayName(),
                feedback.path().value(),
                feedback.receivedAt().format(RECEIVED_AT_FORMAT),
                feedback.id());

        return appendWithinLimit(header, feedback.content().value());
    }

    private static String appendWithinLimit(String header, String content) {
        int headerLength = header.codePointCount(0, header.length());
        int available = DISCORD_CONTENT_MAX_LENGTH - headerLength;
        int contentLength = content.codePointCount(0, content.length());

        if (contentLength <= available) {
            return header + content;
        }

        int end = content.offsetByCodePoints(0, available - 1);
        return header + content.substring(0, end) + "…";
    }
}
