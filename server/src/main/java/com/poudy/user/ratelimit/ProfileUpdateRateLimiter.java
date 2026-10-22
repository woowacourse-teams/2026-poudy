package com.poudy.user.ratelimit;

import com.poudy.common.ratelimit.FixedWindowRateLimiter;
import java.time.Clock;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ProfileUpdateRateLimiter {

    private final FixedWindowRateLimiter delegate;

    public ProfileUpdateRateLimiter(
        @Value("${poudy.user.profile-rate-limit.max-requests}") int maxRequests,
        @Value("${poudy.user.profile-rate-limit.window}") Duration window,
        Clock clock
    ) {
        delegate = new FixedWindowRateLimiter(maxRequests, window, clock);
    }

    public void requireAllowed(long userId) {
        delegate.requireAllowed(String.valueOf(userId));
    }
}
