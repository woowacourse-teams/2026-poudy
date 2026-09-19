package com.poudy.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ProductViewConfig {

    @Bean
    public Clock productViewClock() {
        return Clock.systemUTC();
    }
}
