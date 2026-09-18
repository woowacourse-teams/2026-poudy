package com.poudy.productrequest.service;

import com.poudy.exception.InfrastructureException;
import com.poudy.productrequest.domain.ProductRequest;
import com.poudy.productrequest.domain.ProductRequestStatus;
import com.poudy.productrequest.notification.DiscordProductRequestNotifier;
import com.poudy.productrequest.repository.S3ProductRequestRepository;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
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

    public void submit(String productName, String brandName, String clientId) {
        rateLimiter.requireAllowed(clientId);
        ProductRequest request = ProductRequest.create(productName, brandName, clock);
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

    public ProductRequestPage findAll(ProductRequestStatus status, int page, int size) {
        List<ProductRequest> requests = repository.findAll(status);
        int fromIndex = pageOffset(page, size, requests.size());
        int toIndex = Math.min(fromIndex + size, requests.size());
        return new ProductRequestPage(requests.subList(fromIndex, toIndex), requests.size());
    }

    public ProductRequest findById(UUID requestId) {
        return repository.findById(requestId);
    }

    public ProductRequest changeStatus(UUID requestId, ProductRequestStatus status) {
        ProductRequest current = repository.findById(requestId);
        ProductRequest changed = current.changeStatus(status, clock);
        if (changed == current) {
            return current;
        }

        repository.update(changed);
        return changed;
    }

    private static String notificationFailureDetail(RuntimeException exception) {
        if (exception instanceof InfrastructureException) {
            return exception.getMessage();
        }
        return exception.getClass().getSimpleName();
    }

    private static int pageOffset(int page, int size, int totalElements) {
        long offset = (long) (page - 1) * size;
        if (offset >= totalElements) {
            return totalElements;
        }
        return Math.toIntExact(offset);
    }

    public record ProductRequestPage(List<ProductRequest> items, long totalElements) {

        public ProductRequestPage {
            items = List.copyOf(items);
        }
    }
}
