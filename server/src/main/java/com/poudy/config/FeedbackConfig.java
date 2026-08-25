package com.poudy.config;

import com.poudy.infrastructure.discord.DiscordWebhookClient;
import com.poudy.infrastructure.discord.RestClientDiscordWebhookTransport;
import java.time.Clock;
import java.time.Duration;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import tools.jackson.databind.ObjectMapper;

@Configuration
public class FeedbackConfig {

    private static final ZoneId RECEIVED_AT_ZONE = ZoneId.of("Asia/Seoul");
    static final Duration DISCORD_CONNECT_TIMEOUT = Duration.ofSeconds(2);
    static final Duration DISCORD_READ_TIMEOUT = Duration.ofSeconds(3);
    static final Duration S3_API_CALL_TIMEOUT = Duration.ofSeconds(15);
    static final Duration S3_API_CALL_ATTEMPT_TIMEOUT = Duration.ofSeconds(5);

    @Bean
    public Clock feedbackClock() {
        return Clock.system(RECEIVED_AT_ZONE);
    }

    @Bean
    public RestClient feedbackDiscordRestClient() {
        SimpleClientHttpRequestFactory requestFactory = discordRequestFactory(
                DISCORD_CONNECT_TIMEOUT,
                DISCORD_READ_TIMEOUT);
        return RestClient.builder().requestFactory(requestFactory).build();
    }

    @Bean
    public DiscordWebhookClient feedbackDiscordWebhookClient(
            RestClient feedbackDiscordRestClient,
            ObjectMapper objectMapper) {
        return new DiscordWebhookClient(
                new RestClientDiscordWebhookTransport(feedbackDiscordRestClient),
                objectMapper);
    }

    static SimpleClientHttpRequestFactory discordRequestFactory(Duration connectTimeout, Duration readTimeout) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeout);
        requestFactory.setReadTimeout(readTimeout);
        return requestFactory;
    }

    @Bean
    public S3Client feedbackS3Client(@Value("${poudy.feedback.s3.region}") String region) {
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
