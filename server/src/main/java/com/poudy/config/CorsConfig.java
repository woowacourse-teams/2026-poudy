package com.poudy.config;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private static final String API_PATH_PATTERN = "/api/**";
    private static final String[] ALLOWED_METHODS = {"GET", "HEAD", "POST", "OPTIONS"};
    private static final long PREFLIGHT_MAX_AGE_SECONDS = 3600;

    private final List<String> allowedOrigins;

    public CorsConfig(@Value("${poudy.cors.allowed-origins:}") List<String> allowedOrigins) {
        this.allowedOrigins = allowedOrigins.stream()
            .map(String::trim)
            .filter(origin -> !origin.isEmpty())
            .toList();
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        if (allowedOrigins.isEmpty()) {
            return;
        }

        registry.addMapping(API_PATH_PATTERN)
            .allowedOriginPatterns(allowedOrigins.toArray(String[]::new))
            .allowedMethods(ALLOWED_METHODS)
            .allowedHeaders(CorsConfiguration.ALL)
            .maxAge(PREFLIGHT_MAX_AGE_SECONDS);
    }
}
