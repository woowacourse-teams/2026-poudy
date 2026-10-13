package com.poudy.security.auth.app;

import java.time.Duration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

final class TimeoutRequestFactory {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(2);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(3);

    private TimeoutRequestFactory() {
    }

    static SimpleClientHttpRequestFactory create() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(CONNECT_TIMEOUT);
        requestFactory.setReadTimeout(READ_TIMEOUT);
        return requestFactory;
    }
}
