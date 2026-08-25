package com.poudy.feedback.service;

import com.poudy.exception.TooManyRequestsException;
import com.poudy.ratelimit.FixedWindowRateLimiter;
import java.time.Clock;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class FeedbackRateLimiter {

    private static final int DEFAULT_MAX_TRACKED_CLIENTS = 100_000;
    private static final Duration DEFAULT_PRUNE_INTERVAL = Duration.ofMinutes(1);

    private final FixedWindowRateLimiter rateLimiter;

    @Autowired
    public FeedbackRateLimiter(
            @Value("${poudy.feedback.rate-limit.max-requests}") int maxRequests,
            @Value("${poudy.feedback.rate-limit.window}") Duration window,
            @Qualifier("feedbackClock") Clock clock) {
        this(maxRequests, window, DEFAULT_MAX_TRACKED_CLIENTS, DEFAULT_PRUNE_INTERVAL, clock);
    }

    FeedbackRateLimiter(
            int maxRequests,
            Duration window,
            int maxTrackedClients,
            Duration pruneInterval,
            Clock clock) {
        if (maxRequests <= 0) {
            throw new IllegalArgumentException("의견 등록 제한 횟수는 양수여야 합니다.");
        }
        if (window.isZero() || window.isNegative()) {
            throw new IllegalArgumentException("의견 등록 제한 시간 창은 양수여야 합니다.");
        }
        if (maxTrackedClients <= 0) {
            throw new IllegalArgumentException("의견 등록 추적 대상 수는 양수여야 합니다.");
        }
        if (pruneInterval.isZero() || pruneInterval.isNegative()) {
            throw new IllegalArgumentException("의견 등록 제한 정리 주기는 양수여야 합니다.");
        }
        this.rateLimiter = new FixedWindowRateLimiter(
                maxRequests,
                window,
                maxTrackedClients,
                pruneInterval,
                clock);
    }

    public void requireAllowed(String clientId) {
        rateLimiter.acquire(clientId).ifPresent(retryAfter -> {
            throw new TooManyRequestsException(retryAfter);
        });
    }
}
