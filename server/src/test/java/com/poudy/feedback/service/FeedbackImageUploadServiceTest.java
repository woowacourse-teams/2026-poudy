package com.poudy.feedback.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.poudy.exception.InfrastructureException;
import com.poudy.exception.TooManyRequestsException;
import com.poudy.feedback.domain.FeedbackImage;
import com.poudy.feedback.domain.FeedbackImageFormat;
import com.poudy.feedback.repository.S3FeedbackImageRepository;
import com.poudy.feedback.service.FeedbackImageProcessor.ProcessedImage;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

@DisplayName("의견 이미지 업로드 서비스")
class FeedbackImageUploadServiceTest {

    private final FeedbackImageProcessor processor = mock(FeedbackImageProcessor.class);
    private final S3FeedbackImageRepository repository = mock(S3FeedbackImageRepository.class);
    private final FeedbackImageUploadRateLimiter rateLimiter = mock(FeedbackImageUploadRateLimiter.class);
    private final FeedbackImageUploadService service = new FeedbackImageUploadService(
            processor,
            repository,
            rateLimiter,
            1);

    @Test
    @DisplayName("요청 순서대로 한 장씩 처리하고 ID를 반환한다")
    void uploadsInRequestOrder() {
        MultipartFile first = new MockMultipartFile("images", new byte[] {1});
        MultipartFile second = new MockMultipartFile("images", new byte[] {2});
        ProcessedImage firstProcessed = new ProcessedImage(FeedbackImageFormat.PNG, new byte[] {3});
        ProcessedImage secondProcessed = new ProcessedImage(FeedbackImageFormat.JPEG, new byte[] {4});
        FeedbackImage firstStored = new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.PNG);
        FeedbackImage secondStored = new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.JPEG);
        given(processor.process(first)).willReturn(firstProcessed);
        given(processor.process(second)).willReturn(secondProcessed);
        given(repository.savePending(firstProcessed)).willReturn(firstStored);
        given(repository.savePending(secondProcessed)).willReturn(secondStored);

        List<UUID> result = service.upload(List.of(first, second), "client-a");

        assertThat(result).containsExactly(firstStored.id(), secondStored.id());
        InOrder order = inOrder(processor, repository);
        order.verify(processor).process(first);
        order.verify(repository).savePending(firstProcessed);
        order.verify(processor).process(second);
        order.verify(repository).savePending(secondProcessed);
        verify(rateLimiter).requireAllowed("client-a");
    }

    @Test
    @DisplayName("일부 저장 실패 시 앞서 저장한 pending을 정리하고 ID를 반환하지 않는다")
    void cleansBatchAfterPartialFailure() {
        MultipartFile first = new MockMultipartFile("images", new byte[] {1});
        MultipartFile second = new MockMultipartFile("images", new byte[] {2});
        ProcessedImage firstProcessed = new ProcessedImage(FeedbackImageFormat.PNG, new byte[] {3});
        ProcessedImage secondProcessed = new ProcessedImage(FeedbackImageFormat.JPEG, new byte[] {4});
        FeedbackImage firstStored = new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.PNG);
        given(processor.process(first)).willReturn(firstProcessed);
        given(processor.process(second)).willReturn(secondProcessed);
        given(repository.savePending(firstProcessed)).willReturn(firstStored);
        given(repository.savePending(secondProcessed)).willThrow(new InfrastructureException("S3 실패"));

        assertThatThrownBy(() -> service.upload(List.of(first, second), "client-a"))
                .isInstanceOf(InfrastructureException.class);

        verify(repository).cleanupPending(List.of(firstStored));
    }

    @Test
    @DisplayName("이미지 처리 슬롯이 사용 중이면 요청 스레드를 대기시키지 않는다")
    void rejectsWhenImageProcessingIsBusy() throws Exception {
        MultipartFile first = new MockMultipartFile("images", new byte[] {1});
        MultipartFile second = new MockMultipartFile("images", new byte[] {2});
        ProcessedImage processed = new ProcessedImage(FeedbackImageFormat.PNG, new byte[] {3});
        FeedbackImage stored = new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.PNG);
        CountDownLatch processingStarted = new CountDownLatch(1);
        CountDownLatch releaseProcessing = new CountDownLatch(1);
        given(processor.process(first)).willAnswer(invocation -> {
            processingStarted.countDown();
            releaseProcessing.await();
            return processed;
        });
        given(repository.savePending(processed)).willReturn(stored);

        try (ExecutorService executor = Executors.newSingleThreadExecutor()) {
            Future<List<UUID>> active = executor.submit(() -> service.upload(List.of(first), "client-a"));
            processingStarted.await();

            assertThatThrownBy(() -> service.upload(List.of(second), "client-b"))
                    .isInstanceOf(TooManyRequestsException.class);

            releaseProcessing.countDown();
            assertThat(active.get()).containsExactly(stored.id());
        }
        verify(rateLimiter, times(1)).requireAllowed("client-a");
    }
}
