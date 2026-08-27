package com.poudy.productrequest.service;

import com.poudy.exception.InfrastructureException;
import com.poudy.productrequest.controller.dto.ProductRegistrationRequest;
import com.poudy.productrequest.domain.ProductRequest;
import com.poudy.productrequest.notification.DiscordProductRequestNotifier;
import com.poudy.productrequest.repository.S3ProductRequestRepository;
import java.time.Clock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

@Service
public class ProductRequestService {

    private static final Logger log = LoggerFactory.getLogger(ProductRequestService.class);

    private final S3ProductRequestRepository repository;
    private final DiscordProductRequestNotifier notifier;
    private final ProductRequestRateLimiter rateLimiter;
    private final Clock clock;

    public ProductRequestService(
        S3ProductRequestRepository repository,
        DiscordProductRequestNotifier notifier,
        ProductRequestRateLimiter rateLimiter,
        @Qualifier("productRequestClock") Clock clock
    ) {
        this.repository = repository;
        this.notifier = notifier;
        this.rateLimiter = rateLimiter;
        this.clock = clock;
    }

    public void submit(ProductRegistrationRequest body, String clientId) {
        rateLimiter.requireAllowed(clientId);
        ProductRequest request = ProductRequest.create(body.productName(), body.brandName(), clock);
        repository.save(request);

        try {
            notifier.notify(request);
        } catch (RuntimeException exception) {
            log.error(
                "Product request was stored but Discord notification failed: requestId={}, detail={}",
                request.requestId(),
                notificationFailureDetail(exception)
            );
        }
    }

    private static String notificationFailureDetail(RuntimeException exception) {
        if (exception instanceof InfrastructureException) {
            return exception.getMessage();
        }
        return exception.getClass().getSimpleName();
    }
}
