package com.poudy.infrastructure.discord;

import java.net.URI;

public interface DiscordWebhookTransport {

    int post(URI webhookUri, String payload);
}
