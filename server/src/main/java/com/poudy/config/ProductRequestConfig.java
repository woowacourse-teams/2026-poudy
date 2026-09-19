package com.poudy.config;

import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
public class ProductRequestConfig {

    private static final Duration S3_API_CALL_TIMEOUT = Duration.ofSeconds(15);
    private static final Duration S3_API_CALL_ATTEMPT_TIMEOUT = Duration.ofSeconds(5);

    @Bean
    @ConditionalOnProperty(name = "poudy.legacy-s3-migration.enabled", havingValue = "true")
    public S3Client legacyProductRequestS3Client(
        @Value("${poudy.product-request.legacy-s3.region}") String region
    ) {
        ClientOverrideConfiguration timeouts = ClientOverrideConfiguration.builder()
            .apiCallTimeout(S3_API_CALL_TIMEOUT)
            .apiCallAttemptTimeout(S3_API_CALL_ATTEMPT_TIMEOUT)
            .build();
        return S3Client.builder()
            .region(Region.of(region))
            .overrideConfiguration(timeouts)
            .build();
    }

    @Bean
    public HttpClient productRequestHttpClient() {
        return HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    }
}
