package com.poudy.productrequest.service;

import com.poudy.common.discord.DiscordWebhook;
import com.poudy.exception.InfrastructureException;
import com.poudy.productrequest.domain.ProductRequest;
import com.poudy.productrequest.domain.ProductRequestPage;
import com.poudy.productrequest.domain.ProductRequestStatus;
import com.poudy.productrequest.ratelimit.ProductRequestRateLimiter;
import com.poudy.productrequest.repository.ProductRequestRepository;
import java.time.Clock;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ProductRequestService {

    private static final Logger log = LoggerFactory.getLogger(ProductRequestService.class);

    private final ProductRequestRepository repository;
    private final DiscordWebhook webhook;
    private final String webhookUrl;
    private final ProductRequestRateLimiter rateLimiter;
    private final Clock clock;

    public ProductRequestService(
        ProductRequestRepository repository,
        DiscordWebhook webhook,
        @Value("${poudy.product-request.discord.webhook-url:}") String webhookUrl,
        ProductRequestRateLimiter rateLimiter,
        Clock clock
    ) {
        this.repository = repository;
        this.webhook = webhook;
        this.webhookUrl = webhookUrl;
        this.rateLimiter = rateLimiter;
        this.clock = clock;
    }

    public void submit(String productName, String brandName, String clientId) {
        rateLimiter.requireAllowed(clientId);
        ProductRequest request = ProductRequest.create(productName, brandName, clock);
        repository.save(request);

        try {
            webhook.send(webhookUrl, messageOf(request));
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
        return tryChangeStatus(requestId, status)
            .or(() -> tryChangeStatus(requestId, status))
            .orElseThrow(() -> new InfrastructureException("제품 등록 요청 상태가 동시에 바뀌어 저장하지 못했습니다."));
    }

    private Optional<ProductRequest> tryChangeStatus(UUID requestId, ProductRequestStatus status) {
        ProductRequest current = repository.findById(requestId);
        ProductRequest changed = current.changeStatus(status, clock);
        if (changed == current) {
            return Optional.of(current);
        }
        if (repository.updateStatus(current.status(), changed)) {
            return Optional.of(changed);
        }
        return Optional.empty();
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

    private static String messageOf(ProductRequest request) {
        return "신규 제품 등록 요청\n제품명: " + request.productName() + brandLineOf(request);
    }

    private static String brandLineOf(ProductRequest request) {
        if (request.brandName() == null) {
            return "";
        }

        return "\n브랜드명: " + request.brandName();
    }
}
