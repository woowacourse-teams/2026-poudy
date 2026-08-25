package com.poudy.infrastructure.discord;

import java.net.URI;
import java.util.Objects;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

public class DiscordWebhookClient {

    private final DiscordWebhookTransport transport;
    private final ObjectMapper objectMapper;

    public DiscordWebhookClient(DiscordWebhookTransport transport, ObjectMapper objectMapper) {
        this.transport = Objects.requireNonNull(transport);
        this.objectMapper = Objects.requireNonNull(objectMapper);
    }

    public int post(URI webhookUri, Object payload) {
        return transport.post(webhookUri, serialize(payload));
    }

    private String serialize(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JacksonException exception) {
            throw DiscordWebhookException.serializationFailure();
        }
    }
}
