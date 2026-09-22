package com.poudy.feedback.ratelimit;

import com.poudy.common.ratelimit.FixedWindowRateLimiter;
import java.time.Clock;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class FeedbackRateLimits {

    private final FixedWindowRateLimiter submit;
    private final FixedWindowRateLimiter imageUpload;

    public FeedbackRateLimits(
        @Value("${poudy.feedback.rate-limit.max-requests}") int submitMaxRequests,
        @Value("${poudy.feedback.rate-limit.window}") Duration submitWindow,
        @Value("${poudy.feedback.image-upload-rate-limit.max-requests}") int imageUploadMaxRequests,
        @Value("${poudy.feedback.image-upload-rate-limit.window}") Duration imageUploadWindow,
        Clock clock
    ) {
        this.submit = new FixedWindowRateLimiter(submitMaxRequests, submitWindow, clock);
        this.imageUpload = new FixedWindowRateLimiter(imageUploadMaxRequests, imageUploadWindow, clock);
    }

    public void requireSubmitAllowed(String clientId) {
        submit.requireAllowed(clientId);
    }

    public void requireImageUploadAllowed(String clientId) {
        imageUpload.requireAllowed(clientId);
    }
}
