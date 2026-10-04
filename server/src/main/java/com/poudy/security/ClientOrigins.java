package com.poudy.security;

import java.util.List;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

public final class ClientOrigins {

    private static final String API_PATH_PATTERN = "/api/**";
    private static final List<String> ALLOWED_METHODS = List
        .of("GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");
    private static final long PREFLIGHT_MAX_AGE_SECONDS = 3600;
    private static final String ORIGIN_WILDCARD = "*";

    private final List<String> origins;
    private final CorsConfiguration corsConfiguration;

    private ClientOrigins(List<String> origins, CorsConfiguration corsConfiguration) {
        this.origins = origins;
        this.corsConfiguration = corsConfiguration;
    }

    public static ClientOrigins from(List<String> configuredOrigins) {
        List<String> origins = configuredOrigins.stream()
            .map(String::trim)
            .filter(origin -> !origin.isEmpty())
            .toList();

        CorsConfiguration corsConfiguration = new CorsConfiguration();
        corsConfiguration.setAllowedOriginPatterns(origins);
        corsConfiguration.setAllowedMethods(ALLOWED_METHODS);
        corsConfiguration.setAllowedHeaders(List.of(CorsConfiguration.ALL));
        corsConfiguration.setAllowCredentials(true);
        corsConfiguration.setMaxAge(PREFLIGHT_MAX_AGE_SECONDS);

        return new ClientOrigins(origins, corsConfiguration);
    }

    public CorsConfigurationSource corsConfigurationSource() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        if (!origins.isEmpty()) {
            source.registerCorsConfiguration(API_PATH_PATTERN, corsConfiguration);
        }
        return source;
    }

    public boolean isAllowedOrigin(String origin) {
        return corsConfiguration.checkOrigin(origin) != null;
    }

    public String clientUrl(String path) {
        return origins.stream()
            .filter(origin -> !origin.contains(ORIGIN_WILDCARD))
            .findFirst()
            .orElse("") + path;
    }
}
