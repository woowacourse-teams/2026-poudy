package com.poudy.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class ClockConfig {

    @Bean
    @Primary
    public Clock clock() {
        return Clock.systemUTC();
    }
}
