package com.poudy.feedback.service;

import com.poudy.common.ratelimit.FixedWindowRateLimiter;
import java.time.Clock;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class FeedbackRateLimiter {

    private final FixedWindowRateLimiter delegate;

    public FeedbackRateLimiter(
        @Value("${poudy.feedback.rate-limit.max-requests}") int maxRequests,
        @Value("${poudy.feedback.rate-limit.window}") Duration window,
        @Qualifier("feedbackClock") Clock clock
    ) {
        delegate = new FixedWindowRateLimiter(maxRequests, window, clock);
    }

    public void requireAllowed(String clientId) {
        delegate.requireAllowed(clientId);
    }
}
