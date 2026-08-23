package com.poudy.config;

import java.time.Clock;
import java.time.Duration;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
public class FeedbackConfig {

    private static final ZoneId RECEIVED_AT_ZONE = ZoneId.of("Asia/Seoul");
    private static final Duration DISCORD_CONNECT_TIMEOUT = Duration.ofSeconds(2);
    private static final Duration DISCORD_READ_TIMEOUT = Duration.ofSeconds(3);

    @Bean
    public Clock feedbackClock() {
        return Clock.system(RECEIVED_AT_ZONE);
    }

    @Bean
    public S3Client feedbackS3Client(@Value("${poudy.feedback.s3.region}") String region) {
        return S3Client.builder().region(Region.of(region)).build();
    }

    @Bean
    public RestClient feedbackDiscordRestClient() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(DISCORD_CONNECT_TIMEOUT);
        requestFactory.setReadTimeout(DISCORD_READ_TIMEOUT);

        return RestClient.builder().requestFactory(requestFactory).build();
    }
}
