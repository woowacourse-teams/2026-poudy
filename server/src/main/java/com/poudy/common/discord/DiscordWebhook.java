package com.poudy.common.discord;

import com.poudy.exception.InfrastructureException;
import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class DiscordWebhook {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(2);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(3);

    private final RestClient restClient;

    public DiscordWebhook() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(CONNECT_TIMEOUT);
        requestFactory.setReadTimeout(READ_TIMEOUT);
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    public void send(String webhookUrl, String content) {
        if (!StringUtils.hasText(webhookUrl)) {
            throw new InfrastructureException("Discord webhook이 설정되지 않았습니다.");
        }

        try {
            restClient.post()
                .uri(URI.create(webhookUrl.trim() + "?wait=true"))
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("content", content, "allowed_mentions", Map.of("parse", List.of())))
                .retrieve()
                .onStatus(
                    status -> !status.is2xxSuccessful(),
                    (request, response) -> {
                        throw new InfrastructureException(
                            "Discord 알림이 실패했습니다. status=" + response.getStatusCode().value()
                        );
                    }
                )
                .toBodilessEntity();
        } catch (RestClientException exception) {
            throw new InfrastructureException(
                "Discord 알림을 전송하지 못했습니다. cause=" + exception.getClass().getSimpleName()
            );
        }
    }
}
