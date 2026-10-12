package com.poudy.security.auth.admin.ratelimit;

import com.poudy.common.ratelimit.FixedWindowRateLimiter;
import java.time.Clock;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AdminLoginRateLimiter {

    private final FixedWindowRateLimiter delegate;

    public AdminLoginRateLimiter(
        @Value("${poudy.admin.login-rate-limit.max-requests}") int maxRequests,
        @Value("${poudy.admin.login-rate-limit.window}") Duration window,
        Clock clock
    ) {
        delegate = new FixedWindowRateLimiter(maxRequests, window, clock);
    }

    public void requireAllowed(String clientId) {
        delegate.requireAllowed(clientId);
    }
}
