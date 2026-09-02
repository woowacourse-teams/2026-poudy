package com.poudy.productrequest.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.poudy.exception.InfrastructureException;
import com.poudy.productrequest.domain.ProductRequest;
import com.poudy.productrequest.notification.DiscordProductRequestNotifier;
import com.poudy.productrequest.repository.S3ProductRequestRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

@DisplayName("제품 등록 요청 서비스")
class ProductRequestServiceTest {

    private final S3ProductRequestRepository repository = mock(S3ProductRequestRepository.class);
    private final DiscordProductRequestNotifier notifier = mock(DiscordProductRequestNotifier.class);
    private final ProductRequestRateLimiter rateLimiter = mock(ProductRequestRateLimiter.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-08-23T12:34:56Z"), ZoneOffset.UTC);
    private final ProductRequestService service = new ProductRequestService(repository, notifier, rateLimiter, clock);

    @Test
    @DisplayName("요청 제한 확인 후 저장하고 Discord에 알린다")
    void storesThenNotifies() {
        service.submit("제품", "브랜드", "client-a");

        ArgumentCaptor<ProductRequest> stored = ArgumentCaptor.forClass(ProductRequest.class);
        InOrder order = inOrder(rateLimiter, repository, notifier);
        order.verify(rateLimiter).requireAllowed("client-a");
        order.verify(repository).save(stored.capture());
        order.verify(notifier).notify(stored.getValue());
        assertThat(stored.getValue().productName()).isEqualTo("제품");
        assertThat(stored.getValue().brandName()).isEqualTo("브랜드");
        assertThat(stored.getValue().requestedAt()).isEqualTo("2026-08-23T12:34:56Z");
    }

    @Test
    @DisplayName("중복 내용도 서로 다른 요청 ID로 저장한다")
    void storesDuplicateContentIndependently() {
        service.submit("제품", null, "client-a");
        service.submit("제품", null, "client-a");

        ArgumentCaptor<ProductRequest> requests = ArgumentCaptor.forClass(ProductRequest.class);
        verify(repository, times(2)).save(requests.capture());
        assertThat(requests.getAllValues()).extracting(ProductRequest::requestId).doesNotHaveDuplicates();
    }

    @Test
    @DisplayName("S3 저장이 실패하면 Discord를 호출하지 않고 실패를 반환한다")
    void stopsWhenStorageFails() {
        willThrow(new InfrastructureException("storage failed")).given(repository)
            .save(org.mockito.ArgumentMatchers.any());

        assertThatThrownBy(() -> service.submit("제품", null, "client-a"))
            .isInstanceOf(InfrastructureException.class);
        verify(notifier, never()).notify(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("S3 저장 후 Discord만 실패하면 재시도 없이 접수 성공을 유지한다")
    void acceptsWithoutRetryWhenOnlyNotificationFails() {
        willDoNothing().given(repository).save(org.mockito.ArgumentMatchers.any());
        willThrow(new InfrastructureException("notification failed"))
            .given(notifier)
            .notify(org.mockito.ArgumentMatchers.any());

        assertThatNoException().isThrownBy(() -> service.submit("제품", null, "client-a"));
        verify(repository).save(org.mockito.ArgumentMatchers.any());
        verify(notifier, times(1)).notify(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("S3 저장 후 예기치 않은 Discord 오류도 접수 성공을 바꾸지 않는다")
    void acceptsWhenNotificationThrowsUnexpectedFailure() {
        willThrow(new IllegalArgumentException("webhook-secret"))
            .given(notifier)
            .notify(org.mockito.ArgumentMatchers.any());

        assertThatNoException().isThrownBy(() -> service.submit("제품", null, "client-a"));
        verify(repository).save(org.mockito.ArgumentMatchers.any());
    }
}
