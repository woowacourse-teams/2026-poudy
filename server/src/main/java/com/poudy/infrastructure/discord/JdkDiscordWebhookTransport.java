package com.poudy.infrastructure.discord;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Objects;

public class JdkDiscordWebhookTransport implements DiscordWebhookTransport {

    private final HttpClient httpClient;
    private final Duration requestTimeout;

    public JdkDiscordWebhookTransport(HttpClient httpClient, Duration requestTimeout) {
        this.httpClient = Objects.requireNonNull(httpClient);
        this.requestTimeout = Objects.requireNonNull(requestTimeout);
    }

    @Override
    public int post(URI webhookUri, String payload) {
        HttpRequest request = HttpRequest.newBuilder(webhookUri)
                .timeout(requestTimeout)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                .build();

        try {
            return httpClient.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw DiscordWebhookException.interruptedFailure();
        } catch (IOException exception) {
            throw DiscordWebhookException.transportFailure(exception.getClass().getSimpleName());
        }
    }
}
