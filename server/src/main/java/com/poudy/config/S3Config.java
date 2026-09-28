package com.poudy.config;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
public class S3Config {

    static final Duration API_CALL_TIMEOUT = Duration.ofSeconds(15);
    static final Duration API_CALL_ATTEMPT_TIMEOUT = Duration.ofSeconds(5);

    @Bean
    public S3Client feedbackImageS3Client(@Value("${poudy.feedback.image-s3.region}") String region) {
        return client(region);
    }

    private static S3Client client(String region) {
        ClientOverrideConfiguration timeouts = ClientOverrideConfiguration.builder()
            .apiCallTimeout(API_CALL_TIMEOUT)
            .apiCallAttemptTimeout(API_CALL_ATTEMPT_TIMEOUT)
            .build();

        return S3Client.builder()
            .region(Region.of(region))
            .overrideConfiguration(timeouts)
            .build();
    }
}
