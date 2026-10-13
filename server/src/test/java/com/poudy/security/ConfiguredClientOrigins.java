package com.poudy.security;

public final class ConfiguredClientOrigins {

    public static final String PROPERTY = "poudy.cors.allowed-origins="
        + "https://staging-app.poudy.site, https://*.preview.poudy.site, "
        + "http://localhost:3000, https://poudy.example.com, https://*.preview.example.com";

    private ConfiguredClientOrigins() {
    }
}
