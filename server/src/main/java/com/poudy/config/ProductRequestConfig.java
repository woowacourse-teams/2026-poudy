package com.poudy.config;

import com.poudy.infrastructure.discord.DiscordWebhookClient;
import com.poudy.infrastructure.discord.JdkDiscordWebhookTransport;
import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import tools.jackson.databind.ObjectMapper;

@Configuration
public class ProductRequestConfig {

    static final Duration DISCORD_CONNECT_TIMEOUT = Duration.ofSeconds(3);
    static final Duration DISCORD_REQUEST_TIMEOUT = Duration.ofSeconds(5);
    static final Duration S3_API_CALL_TIMEOUT = Duration.ofSeconds(15);
    static final Duration S3_API_CALL_ATTEMPT_TIMEOUT = Duration.ofSeconds(5);

    @Bean
    public Clock productRequestClock() {
        return Clock.systemUTC();
    }

    @Bean
    public HttpClient productRequestHttpClient() {
        return HttpClient.newBuilder().connectTimeout(DISCORD_CONNECT_TIMEOUT).build();
    }

    @Bean
    public DiscordWebhookClient productRequestDiscordWebhookClient(
            HttpClient productRequestHttpClient,
            ObjectMapper objectMapper) {
        return new DiscordWebhookClient(
                new JdkDiscordWebhookTransport(productRequestHttpClient, DISCORD_REQUEST_TIMEOUT),
                objectMapper);
    }

    @Bean
    public S3Client productRequestS3Client(@Value("${poudy.product-request.s3.region}") String region) {
        ClientOverrideConfiguration timeouts = ClientOverrideConfiguration.builder()
                .apiCallTimeout(S3_API_CALL_TIMEOUT)
                .apiCallAttemptTimeout(S3_API_CALL_ATTEMPT_TIMEOUT)
                .build();

        return S3Client.builder()
                .region(Region.of(region))
                .overrideConfiguration(timeouts)
                .build();
    }
}
