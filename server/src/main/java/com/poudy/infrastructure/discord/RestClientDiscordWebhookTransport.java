package com.poudy.infrastructure.discord;

import java.net.URI;
import java.util.Objects;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

public class RestClientDiscordWebhookTransport implements DiscordWebhookTransport {

    private final RestClient restClient;

    public RestClientDiscordWebhookTransport(RestClient restClient) {
        this.restClient = Objects.requireNonNull(restClient);
    }

    @Override
    public int post(URI webhookUri, String payload) {
        try {
            return restClient.post()
                    .uri(webhookUri)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .exchange((request, response) -> response.getStatusCode().value());
        } catch (RestClientException exception) {
            throw DiscordWebhookException.transportFailure(exception.getClass().getSimpleName());
        }
    }
}
