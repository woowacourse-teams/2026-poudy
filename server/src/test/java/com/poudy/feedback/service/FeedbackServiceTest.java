package com.poudy.feedback.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InfrastructureException;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackContent;
import com.poudy.feedback.domain.FeedbackImage;
import com.poudy.feedback.domain.FeedbackImageFormat;
import com.poudy.feedback.domain.FeedbackPath;
import com.poudy.feedback.domain.FeedbackStatus;
import com.poudy.feedback.domain.FeedbackType;
import com.poudy.feedback.domain.ProductCorrection;
import com.poudy.feedback.domain.ServiceFeedback;
import com.poudy.feedback.notification.FeedbackNotifier;
import com.poudy.feedback.repository.S3FeedbackRepository;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.Products;
import com.poudy.product.repository.ProductRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

@ExtendWith(OutputCaptureExtension.class)
@DisplayName("의견 서비스")
class FeedbackServiceTest {

    private static final Clock CLOCK = Clock.fixed(
        Instant.parse("2026-08-23T07:20:30Z"),
        ZoneId.of("Asia/Seoul")
    );

    private final S3FeedbackRepository feedbackRepository = mock(S3FeedbackRepository.class);
    private final FeedbackNotifier feedbackNotifier = mock(FeedbackNotifier.class);
    private final FeedbackRateLimiter rateLimiter = mock(FeedbackRateLimiter.class);
    private final ProductRepository productRepository = mock(ProductRepository.class);
    private final Products products = mock(Products.class);
    private final FeedbackService feedbackService = new FeedbackService(
        feedbackRepository,
        feedbackNotifier,
        rateLimiter,
        productRepository,
        CLOCK
    );

    @Test
    @DisplayName("원본을 저장한 뒤 같은 의견으로 Discord 알림을 전송한다")
    void storesBeforeNotifying() {
        feedbackService.submit(
            FeedbackType.BUG_REPORT,
            "검색 버튼을 눌러도 반응이 없어요.",
            "/products?include=123",
            "client-a"
        );

        ArgumentCaptor<Feedback> feedbackCaptor = ArgumentCaptor.forClass(Feedback.class);
        InOrder order = inOrder(rateLimiter, feedbackRepository, feedbackNotifier);
        order.verify(rateLimiter).requireAllowed("client-a");
        order.verify(feedbackRepository).save(feedbackCaptor.capture());
        order.verify(feedbackNotifier).notify(feedbackCaptor.getValue());
        assertThat(feedbackCaptor.getValue().subject())
            .isEqualTo(new ServiceFeedback(FeedbackType.BUG_REPORT, FeedbackPath.from("/products?include=123")));
        assertThat(feedbackCaptor.getValue().receivedAt())
            .isEqualTo(OffsetDateTime.parse("2026-08-23T16:20:30+09:00"));
    }

    @Test
    @DisplayName("화면 경로가 없으면 알 수 없는 경로로 접수한다")
    void acceptsMissingPath() {
        feedbackService.submit(FeedbackType.OTHER, "화면과 관계없는 기타 의견입니다.", null, "client-a");

        ArgumentCaptor<Feedback> feedbackCaptor = ArgumentCaptor.forClass(Feedback.class);
        verify(feedbackRepository).save(feedbackCaptor.capture());
        assertThat(feedbackCaptor.getValue().subject())
            .isEqualTo(new ServiceFeedback(FeedbackType.OTHER, FeedbackPath.from(null)));
    }

    @Test
    @DisplayName("S3 저장이 실패하면 Discord 알림을 전송하지 않는다")
    void skipsNotificationWhenStorageFails() {
        willThrow(new InfrastructureException("S3 실패")).given(feedbackRepository).save(any());

        assertThatThrownBy(
            () -> feedbackService.submit(
                FeedbackType.BUG_REPORT,
                "기능 버튼을 눌러도 화면이 바뀌지 않아요.",
                "/products",
                "client-a"
            )
        )
            .isInstanceOf(InfrastructureException.class);
        verify(feedbackNotifier, never()).notify(any());
    }

    @Test
    @DisplayName("Discord 알림이 실패해도 접수 ID만 기록하고 성공 처리한다")
    void keepsSubmissionSuccessfulWhenNotificationFails(CapturedOutput output) {
        String content = "로그에 남으면 안 되는 사용자 의견 원문입니다.";
        willThrow(new RuntimeException("webhook secret"))
            .given(feedbackNotifier)
            .notify(any());

        assertThatCode(() -> feedbackService.submit(FeedbackType.OTHER, content, "/", "client-a"))
            .doesNotThrowAnyException();

        ArgumentCaptor<Feedback> feedbackCaptor = ArgumentCaptor.forClass(Feedback.class);
        verify(feedbackRepository).save(feedbackCaptor.capture());
        assertThat(output).contains(feedbackCaptor.getValue().id().toString());
        assertThat(output).doesNotContain(content).doesNotContain("webhook secret");
    }

    @Test
    @DisplayName("이미지 저장 절차를 저장소에 위임하고 귀속된 의견으로 알린다")
    void delegatesImageStorageAndNotifiesAttachedFeedback() {
        UUID imageId = UUID.fromString("8f8ba9b8-4da7-46c7-9f97-3d86aa7de2bf");
        FeedbackImage image = new FeedbackImage(imageId, FeedbackImageFormat.PNG);
        given(feedbackRepository.save(any(Feedback.class), eq(List.of(imageId)), any()))
            .willAnswer(invocation -> ((Feedback) invocation.getArgument(0)).attachImages(List.of(image)));

        feedbackService.submit(
            FeedbackType.BUG_REPORT,
            "검색 버튼을 눌러도 반응이 없어요.",
            "/products",
            List.of(imageId),
            "client-a"
        );

        ArgumentCaptor<Feedback> feedbackCaptor = ArgumentCaptor.forClass(Feedback.class);
        verify(feedbackRepository).save(feedbackCaptor.capture(), eq(List.of(imageId)), any());
        Feedback attached = feedbackCaptor.getValue().attachImages(List.of(image));
        verify(feedbackNotifier).notify(attached);
    }

    @Test
    @DisplayName("제품 정보 정정 요청을 대상 제품과 함께 저장하고 알린다")
    void submitsProductCorrection() {
        Product product = mock(Product.class);
        given(product.id()).willReturn(1L);
        given(product.name()).willReturn("블랙 스네일 토너");
        given(productRepository.findAll()).willReturn(products);
        given(products.findById(1L)).willReturn(Optional.of(product));

        feedbackService.submitProductCorrection(1L, "전성분 표기가 실제 패키지와 달라요.", List.of(), "client-a");

        ArgumentCaptor<Feedback> feedbackCaptor = ArgumentCaptor.forClass(Feedback.class);
        InOrder order = inOrder(rateLimiter, feedbackRepository, feedbackNotifier);
        order.verify(rateLimiter).requireAllowed("client-a");
        order.verify(feedbackRepository).save(feedbackCaptor.capture());
        order.verify(feedbackNotifier).notify(feedbackCaptor.getValue());
        assertThat(feedbackCaptor.getValue().subject()).isEqualTo(new ProductCorrection(1L, "블랙 스네일 토너"));
    }

    @Test
    @DisplayName("없는 제품의 정정 요청은 요청 제한과 저장 없이 거절한다")
    void rejectsCorrectionForUnknownProduct() {
        given(productRepository.findAll()).willReturn(products);
        given(products.findById(999999L)).willReturn(Optional.empty());

        assertThatThrownBy(
            () -> feedbackService.submitProductCorrection(
                999999L,
                "전성분 표기가 실제 패키지와 달라요.",
                List.of(),
                "client-a"
            )
        )
            .isInstanceOf(ResourceNotFoundException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.PRODUCT_NOT_FOUND);
        verify(rateLimiter, never()).requireAllowed(anyString());
        verify(feedbackRepository, never()).save(any());
    }

    @Test
    @DisplayName("피드백 상태 전이를 도메인에 요청한 뒤 변경 결과를 저장한다")
    void changesAndStoresStatus() {
        UUID feedbackId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        Feedback received = feedback(feedbackId);
        given(feedbackRepository.findById(feedbackId)).willReturn(received);

        Feedback changed = feedbackService.changeStatus(feedbackId, FeedbackStatus.COMPLETED);

        assertThat(changed.hasStatus(FeedbackStatus.COMPLETED)).isTrue();
        assertThat(changed.completedAt()).isEqualTo(OffsetDateTime.parse("2026-08-23T16:20:30+09:00"));
        verify(feedbackRepository).updateStatus(changed);
    }

    @Test
    @DisplayName("이미 같은 피드백 상태면 다시 저장하지 않는다")
    void skipsSameStatusUpdate() {
        UUID feedbackId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        Feedback received = feedback(feedbackId);
        given(feedbackRepository.findById(feedbackId)).willReturn(received);

        Feedback unchanged = feedbackService.changeStatus(feedbackId, FeedbackStatus.RECEIVED);

        assertThat(unchanged).isSameAs(received);
        verify(feedbackRepository, never()).updateStatus(any());
    }

    private static Feedback feedback(UUID feedbackId) {
        return new Feedback(
            feedbackId,
            new ServiceFeedback(FeedbackType.OTHER, FeedbackPath.from("/")),
            new FeedbackContent("충분히 긴 기타 의견입니다."),
            OffsetDateTime.parse("2026-08-23T15:00:00+09:00")
        );
    }
}
