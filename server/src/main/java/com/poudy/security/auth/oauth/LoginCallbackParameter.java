package com.poudy.security.auth.oauth;

import java.util.Locale;
import org.springframework.web.util.UriComponentsBuilder;

public enum LoginCallbackParameter {
    STATUS,
    ERROR,
    PROVIDER;

    public UriComponentsBuilder addTo(UriComponentsBuilder url, Enum<?> value) {
        return url.queryParam(name().toLowerCase(Locale.ROOT), value.name());
    }
}
