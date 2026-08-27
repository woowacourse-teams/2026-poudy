package com.poudy.productrequest.service;

import com.poudy.common.ratelimit.FixedWindowRateLimiter;
import java.time.Clock;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ProductRequestRateLimiter {

    private final FixedWindowRateLimiter delegate;

    public ProductRequestRateLimiter(
        @Value("${poudy.product-request.rate-limit.max-requests}") int maxRequests,
        @Value("${poudy.product-request.rate-limit.window}") Duration window,
        @Qualifier("productRequestClock") Clock clock
    ) {
        delegate = new FixedWindowRateLimiter(maxRequests, window, clock);
    }

    public void requireAllowed(String clientId) {
        delegate.requireAllowed(clientId);
    }
}
