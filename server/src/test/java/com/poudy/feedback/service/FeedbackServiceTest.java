package com.poudy.feedback.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.poudy.common.discord.DiscordWebhook;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.InfrastructureException;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackContent;
import com.poudy.feedback.domain.FeedbackPage;
import com.poudy.feedback.domain.FeedbackPath;
import com.poudy.feedback.domain.FeedbackStatus;
import com.poudy.feedback.domain.FeedbackType;
import com.poudy.feedback.domain.ProductCorrection;
import com.poudy.feedback.domain.ServiceFeedback;
import com.poudy.feedback.domain.image.FeedbackImage;
import com.poudy.feedback.domain.image.FeedbackImageFormat;
import com.poudy.feedback.ratelimit.FeedbackRateLimits;
import com.poudy.feedback.repository.FeedbackRepository;
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

    private static final String WEBHOOK_URL = "https://discord.example/webhook/secret";
    private static final Clock CLOCK = Clock.fixed(
        Instant.parse("2026-08-23T07:20:30Z"),
        ZoneId.of("Asia/Seoul")
    );

    private final FeedbackRepository feedbackRepository = mock(FeedbackRepository.class);
    private final DiscordWebhook webhook = mock(DiscordWebhook.class);
    private final FeedbackRateLimits rateLimits = mock(FeedbackRateLimits.class);
    private final ProductRepository productRepository = mock(ProductRepository.class);
    private final Products products = mock(Products.class);
    private final FeedbackImageTransferService imageTransferService = mock(FeedbackImageTransferService.class);
    private final FeedbackService feedbackService = new FeedbackService(
        feedbackRepository,
        webhook,
        WEBHOOK_URL,
        rateLimits,
        productRepository,
        imageTransferService,
        CLOCK
    );

    @Test
    @DisplayName("의견 목록은 전체 건수와 요청한 페이지만 저장소에서 읽는다")
    void readsRequestedPageFromRepository() {
        Feedback feedback = new ProductCorrection(
            UUID.randomUUID(),
            1L,
            "블랙 스네일 토너",
            new FeedbackContent("제품 정보가 실제 패키지와 달라요."),
            OffsetDateTime.now(CLOCK)
        );
        given(feedbackRepository.count(FeedbackStatus.RECEIVED, null)).willReturn(21L);
        given(feedbackRepository.findPage(FeedbackStatus.RECEIVED, null, 20L, 20)).willReturn(List.of(feedback));

        FeedbackPage page = feedbackService.findAll(FeedbackStatus.RECEIVED, null, 2, 20);

        assertThat(page.items()).containsExactly(feedback);
        assertThat(page.totalElements()).isEqualTo(21L);
    }

    @Test
    @DisplayName("전체 건수를 넘는 페이지는 목록을 읽지 않고 빈 페이지를 돌려준다")
    void skipsReadingPageBeyondTotal() {
        given(feedbackRepository.count(null, null)).willReturn(3L);

        FeedbackPage page = feedbackService.findAll(null, null, 2, 20);

        assertThat(page.items()).isEmpty();
        assertThat(page.totalElements()).isEqualTo(3L);
        verify(feedbackRepository, never()).findPage(any(), any(), anyLong(), anyInt());
    }

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
        InOrder order = inOrder(rateLimits, feedbackRepository, webhook);
        order.verify(rateLimits).requireSubmitAllowed("client-a");
        order.verify(feedbackRepository).save(feedbackCaptor.capture());
        order.verify(webhook)
            .send(eq(WEBHOOK_URL), argThat(message -> message.contains(feedbackCaptor.getValue().id().toString())));
        assertThat(feedbackCaptor.getValue()).isInstanceOfSatisfying(ServiceFeedback.class, service -> {
            assertThat(service.feedbackType()).isEqualTo(FeedbackType.BUG_REPORT);
            assertThat(service.path()).isEqualTo(FeedbackPath.from("/products?include=123"));
        });
        assertThat(feedbackCaptor.getValue().receivedAt())
            .isEqualTo(OffsetDateTime.parse("2026-08-23T16:20:30+09:00"));
    }

    @Test
    @DisplayName("화면 경로가 없으면 알 수 없는 경로로 접수한다")
    void acceptsMissingPath() {
        feedbackService.submit(FeedbackType.OTHER, "화면과 관계없는 기타 의견입니다.", null, "client-a");

        ArgumentCaptor<Feedback> feedbackCaptor = ArgumentCaptor.forClass(Feedback.class);
        verify(feedbackRepository).save(feedbackCaptor.capture());
        assertThat(feedbackCaptor.getValue()).isInstanceOfSatisfying(ServiceFeedback.class, service -> {
            assertThat(service.feedbackType()).isEqualTo(FeedbackType.OTHER);
            assertThat(service.path()).isEqualTo(FeedbackPath.from(null));
        });
    }

    @Test
    @DisplayName("DB 저장이 실패하면 Discord 알림을 전송하지 않는다")
    void skipsNotificationWhenStorageFails() {
        willThrow(new InfrastructureException("DB 실패")).given(feedbackRepository).save(any());

        assertThatThrownBy(
            () -> feedbackService.submit(
                FeedbackType.BUG_REPORT,
                "기능 버튼을 눌러도 화면이 바뀌지 않아요.",
                "/products",
                "client-a"
            )
        )
            .isInstanceOf(InfrastructureException.class);
        verify(webhook, never()).send(anyString(), anyString());
    }

    @Test
    @DisplayName("Discord 알림이 실패해도 접수 ID만 기록하고 성공 처리한다")
    void keepsSubmissionSuccessfulWhenNotificationFails(CapturedOutput output) {
        String content = "로그에 남으면 안 되는 사용자 의견 원문입니다.";
        willThrow(new RuntimeException("webhook secret"))
            .given(webhook)
            .send(anyString(), anyString());

        assertThatCode(() -> feedbackService.submit(FeedbackType.OTHER, content, "/", "client-a"))
            .doesNotThrowAnyException();

        ArgumentCaptor<Feedback> feedbackCaptor = ArgumentCaptor.forClass(Feedback.class);
        verify(feedbackRepository).save(feedbackCaptor.capture());
        assertThat(output).contains(feedbackCaptor.getValue().id().toString());
        assertThat(output).doesNotContain(content).doesNotContain("webhook secret");
    }

    @Test
    @DisplayName("이미지를 붙인 의견을 저장한 뒤 이미지를 옮기고 알린다")
    void delegatesImageStorageAndNotifiesAttachedFeedback() {
        UUID imageId = UUID.fromString("8f8ba9b8-4da7-46c7-9f97-3d86aa7de2bf");
        FeedbackImage image = new FeedbackImage(imageId, FeedbackImageFormat.PNG);
        given(feedbackRepository.save(any(Feedback.class), eq(List.of(imageId))))
            .willAnswer(invocation -> ((Feedback) invocation.getArgument(0)).attachImages(List.of(image)));

        feedbackService.submit(
            FeedbackType.BUG_REPORT,
            "검색 버튼을 눌러도 반응이 없어요.",
            "/products",
            List.of(imageId),
            "client-a"
        );

        ArgumentCaptor<Feedback> feedbackCaptor = ArgumentCaptor.forClass(Feedback.class);
        verify(feedbackRepository).save(feedbackCaptor.capture(), eq(List.of(imageId)));
        Feedback attached = feedbackCaptor.getValue().attachImages(List.of(image));
        InOrder order = inOrder(imageTransferService, webhook);
        order.verify(imageTransferService).transfer(attached);
        order.verify(webhook).send(eq(WEBHOOK_URL), argThat(message -> message.contains("첨부 이미지: 1장")));
    }

    @Test
    @DisplayName("제품 정보 정정 요청을 대상 제품과 함께 저장하고 알린다")
    void submitsProductCorrection() {
        Product product = mock(Product.class);
        given(product.id()).willReturn(1L);
        given(product.name()).willReturn("블랙 스네일 토너");
        given(productRepository.findById(1L)).willReturn(Optional.of(product));

        feedbackService.submitProductCorrection(1L, "전성분 표기가 실제 패키지와 달라요.", List.of(), "client-a");

        ArgumentCaptor<Feedback> feedbackCaptor = ArgumentCaptor.forClass(Feedback.class);
        InOrder order = inOrder(rateLimits, feedbackRepository, webhook);
        order.verify(rateLimits).requireSubmitAllowed("client-a");
        order.verify(feedbackRepository).save(feedbackCaptor.capture());
        order.verify(webhook)
            .send(eq(WEBHOOK_URL), argThat(message -> message.contains(feedbackCaptor.getValue().id().toString())));
        assertThat(feedbackCaptor.getValue()).isInstanceOfSatisfying(ProductCorrection.class, correction -> {
            assertThat(correction.productId()).isEqualTo(1L);
            assertThat(correction.productName()).isEqualTo("블랙 스네일 토너");
        });
        verify(webhook).send(
            eq(WEBHOOK_URL),
            argThat(message -> message.contains("유형: 제품 정보 정정") && message.contains("제품: 블랙 스네일 토너 (ID 1)"))
        );
    }

    @Test
    @DisplayName("알림은 유형·화면·한국 시각 접수 시각을 담는다")
    void notifiesTypePathAndKoreanReceivedAt() {
        feedbackService.submit(FeedbackType.BUG_REPORT, "검색 버튼을 눌러도 반응이 없어요.", null, "client-a");

        String message = sentMessage();
        assertThat(message).contains("유형: 기능이 제대로 작동하지 않아요", "화면: 알 수 없음", "접수 시각: 2026-08-23 16:20");
    }

    @Test
    @DisplayName("알림은 첨부 개수를 알리고 Discord 길이를 넘지 않게 본문을 자른다")
    void limitsNotificationToDiscordLength() {
        UUID imageId = UUID.randomUUID();
        given(feedbackRepository.save(any(Feedback.class), eq(List.of(imageId))))
            .willAnswer(
                invocation -> ((Feedback) invocation.getArgument(0)).attachImages(
                    List.of(new FeedbackImage(imageId, FeedbackImageFormat.JPEG))
                )
            );

        feedbackService.submit(FeedbackType.OTHER, "@everyone " + "가".repeat(1990), "/", List.of(imageId), "client-a");

        String message = sentMessage();
        assertThat(message).contains("첨부 이미지: 1장", "@everyone");
        assertThat(message.codePointCount(0, message.length())).isLessThanOrEqualTo(2000);
    }

    private String sentMessage() {
        ArgumentCaptor<String> message = ArgumentCaptor.forClass(String.class);
        verify(webhook).send(eq(WEBHOOK_URL), message.capture());
        return message.getValue();
    }

    @Test
    @DisplayName("없는 제품의 정정 요청은 요청 제한과 저장 없이 거절한다")
    void rejectsCorrectionForUnknownProduct() {
        given(productRepository.findById(999999L)).willReturn(Optional.empty());

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
        verify(rateLimits, never()).requireSubmitAllowed(anyString());
        verify(feedbackRepository, never()).save(any());
    }

    @Test
    @DisplayName("피드백 상태 전이를 도메인에 요청한 뒤 변경 결과를 저장한다")
    void changesAndStoresStatus() {
        UUID feedbackId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        Feedback received = feedback(feedbackId);
        given(feedbackRepository.findById(feedbackId)).willReturn(received);
        given(feedbackRepository.updateStatus(eq(FeedbackStatus.RECEIVED), any())).willReturn(true);

        Feedback changed = feedbackService.changeStatus(feedbackId, FeedbackStatus.COMPLETED);

        assertThat(changed.hasStatus(FeedbackStatus.COMPLETED)).isTrue();
        assertThat(changed.completedAt()).isEqualTo(OffsetDateTime.parse("2026-08-23T16:20:30+09:00"));
        verify(feedbackRepository).updateStatus(FeedbackStatus.RECEIVED, changed);
    }

    @Test
    @DisplayName("이미 같은 피드백 상태면 다시 저장하지 않는다")
    void skipsSameStatusUpdate() {
        UUID feedbackId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        Feedback received = feedback(feedbackId);
        given(feedbackRepository.findById(feedbackId)).willReturn(received);

        Feedback unchanged = feedbackService.changeStatus(feedbackId, FeedbackStatus.RECEIVED);

        assertThat(unchanged).isSameAs(received);
        verify(feedbackRepository, never()).updateStatus(any(), any());
    }

    private static Feedback feedback(UUID feedbackId) {
        return new ServiceFeedback(
            feedbackId,
            FeedbackType.OTHER,
            FeedbackPath.from("/"),
            new FeedbackContent("충분히 긴 기타 의견입니다."),
            OffsetDateTime.parse("2026-08-23T15:00:00+09:00")
        );
    }
}
