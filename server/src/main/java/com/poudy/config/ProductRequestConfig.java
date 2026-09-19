package com.poudy.config;

import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ProductRequestConfig {

    @Bean
    public Clock productRequestClock() {
        return Clock.systemUTC();
    }

    @Bean
    public HttpClient productRequestHttpClient() {
        return HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    }
}
