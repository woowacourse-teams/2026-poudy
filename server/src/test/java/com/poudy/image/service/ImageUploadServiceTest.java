package com.poudy.image.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willAnswer;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.poudy.exception.InfrastructureException;
import com.poudy.exception.TooManyRequestsException;
import com.poudy.image.domain.ImageFormat;
import com.poudy.image.domain.ImagePurpose;
import com.poudy.image.domain.PendingImage;
import com.poudy.image.domain.ProcessedImage;
import com.poudy.image.processing.ImageProcessor;
import com.poudy.image.repository.PendingImageRepository;
import com.poudy.image.repository.S3ImageRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

@DisplayName("이미지 업로드 서비스")
class ImageUploadServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-31T00:00:00Z");

    private final ImageProcessor processor = mock(ImageProcessor.class);
    private final PendingImageRepository pendingRepository = mock(PendingImageRepository.class);
    private final S3ImageRepository imageRepository = mock(S3ImageRepository.class);
    private final ImageUploadService service = new ImageUploadService(
        processor,
        pendingRepository,
        imageRepository,
        Clock.fixed(NOW, ZoneOffset.UTC),
        1
    );

    @Test
    @DisplayName("프로필 업로드는 프로필 용도로 변환한 WebP를 저장한다")
    void uploadsProfileUsingProfileProcessing() {
        MultipartFile file = new MockMultipartFile("image", new byte[] {1});
        ProcessedImage processed = new ProcessedImage(ImageFormat.WEBP, new byte[] {2});
        given(processor.process(file, ImagePurpose.PROFILE)).willReturn(processed);

        UUID id = service.upload(List.of(file), ImagePurpose.PROFILE).getFirst();

        verify(imageRepository).save(id, ImagePurpose.PROFILE, processed);
    }

    @Test
    @DisplayName("요청 순서대로 한 장씩 처리해 임시 이미지 행을 먼저 넣고 파일을 올린다")
    void uploadsInRequestOrder() {
        MultipartFile first = new MockMultipartFile("images", new byte[] {1});
        MultipartFile second = new MockMultipartFile("images", new byte[] {2});
        ProcessedImage firstProcessed = new ProcessedImage(ImageFormat.PNG, new byte[] {3});
        ProcessedImage secondProcessed = new ProcessedImage(ImageFormat.JPEG, new byte[] {4});
        given(processor.process(first, ImagePurpose.FEEDBACK)).willReturn(firstProcessed);
        given(processor.process(second, ImagePurpose.FEEDBACK)).willReturn(secondProcessed);

        List<UUID> result = service.upload(List.of(first, second), ImagePurpose.FEEDBACK);

        assertThat(result).hasSize(2).doesNotHaveDuplicates();
        InOrder order = inOrder(processor, pendingRepository, imageRepository);
        order.verify(processor).process(first, ImagePurpose.FEEDBACK);
        order.verify(pendingRepository).save(pendingOf(result.get(0)), eq(NOW));
        order.verify(imageRepository).save(result.get(0), ImagePurpose.FEEDBACK, firstProcessed);
        order.verify(processor).process(second, ImagePurpose.FEEDBACK);
        order.verify(pendingRepository).save(pendingOf(result.get(1)), eq(NOW));
        order.verify(imageRepository).save(result.get(1), ImagePurpose.FEEDBACK, secondProcessed);
    }

    @Test
    @DisplayName("파일 저장에 실패하면 이번 요청에서 만든 임시 이미지를 모두 지운다")
    void discardsBatchAfterPartialFailure() {
        MultipartFile first = new MockMultipartFile("images", new byte[] {1});
        MultipartFile second = new MockMultipartFile("images", new byte[] {2});
        ProcessedImage firstProcessed = new ProcessedImage(ImageFormat.PNG, new byte[] {3});
        ProcessedImage secondProcessed = new ProcessedImage(ImageFormat.JPEG, new byte[] {4});
        given(processor.process(first, ImagePurpose.FEEDBACK)).willReturn(firstProcessed);
        given(processor.process(second, ImagePurpose.FEEDBACK)).willReturn(secondProcessed);
        willThrow(new InfrastructureException("S3 실패")).given(imageRepository)
            .save(any(UUID.class), eq(ImagePurpose.FEEDBACK), eq(secondProcessed));

        assertThatThrownBy(() -> service.upload(List.of(first, second), ImagePurpose.FEEDBACK))
            .isInstanceOf(InfrastructureException.class);

        ArgumentCaptor<PendingImage> saved = ArgumentCaptor.forClass(PendingImage.class);
        verify(pendingRepository, times(2)).save(saved.capture(), eq(NOW));
        saved.getAllValues().forEach(image -> {
            verify(imageRepository).delete(image.id(), ImagePurpose.FEEDBACK);
            verify(pendingRepository).delete(image.id());
        });
    }

    @Test
    @DisplayName("업로드 실패 뒤 파일을 지우지 못한 임시 이미지는 행을 남겨 정리 작업이 다시 지우게 한다")
    void keepsPendingRowWhenCompensatingDeleteFails() {
        MultipartFile first = new MockMultipartFile("images", new byte[] {1});
        MultipartFile second = new MockMultipartFile("images", new byte[] {2});
        ProcessedImage firstProcessed = new ProcessedImage(ImageFormat.PNG, new byte[] {3});
        ProcessedImage secondProcessed = new ProcessedImage(ImageFormat.JPEG, new byte[] {4});
        given(processor.process(first, ImagePurpose.FEEDBACK)).willReturn(firstProcessed);
        given(processor.process(second, ImagePurpose.FEEDBACK)).willReturn(secondProcessed);
        willThrow(new InfrastructureException("S3 실패")).given(imageRepository)
            .save(any(UUID.class), eq(ImagePurpose.FEEDBACK), eq(secondProcessed));
        willThrow(new InfrastructureException("S3 삭제 실패")).given(imageRepository)
            .delete(any(UUID.class), eq(ImagePurpose.FEEDBACK));

        assertThatThrownBy(() -> service.upload(List.of(first, second), ImagePurpose.FEEDBACK))
            .isInstanceOf(InfrastructureException.class)
            .hasMessage("S3 실패");

        verify(pendingRepository, never()).delete(any(UUID.class));
    }

    @Test
    @DisplayName("이미지 처리 슬롯이 사용 중이면 요청 스레드를 대기시키지 않는다")
    void rejectsWhenImageProcessingIsBusy() throws Exception {
        MultipartFile first = new MockMultipartFile("images", new byte[] {1});
        MultipartFile second = new MockMultipartFile("images", new byte[] {2});
        ProcessedImage processed = new ProcessedImage(ImageFormat.PNG, new byte[] {3});
        CountDownLatch processingStarted = new CountDownLatch(1);
        CountDownLatch releaseProcessing = new CountDownLatch(1);
        given(processor.process(first, ImagePurpose.FEEDBACK)).willAnswer(invocation -> {
            processingStarted.countDown();
            releaseProcessing.await();
            return processed;
        });

        try (ExecutorService executor = Executors.newSingleThreadExecutor()) {
            Future<List<UUID>> active = executor.submit(() -> service.upload(List.of(first), ImagePurpose.FEEDBACK));
            processingStarted.await();

            assertThatThrownBy(() -> service.upload(List.of(second), ImagePurpose.FEEDBACK))
                .isInstanceOf(TooManyRequestsException.class);

            releaseProcessing.countDown();
            assertThat(active.get()).hasSize(1);
        }
    }

    @Test
    @DisplayName("이미지 저장 중에는 처리 슬롯을 점유하지 않는다")
    void releasesImageProcessingPermitBeforeStorage() throws Exception {
        MultipartFile first = new MockMultipartFile("images", new byte[] {1});
        MultipartFile second = new MockMultipartFile("images", new byte[] {2});
        ProcessedImage firstProcessed = new ProcessedImage(ImageFormat.PNG, new byte[] {3});
        ProcessedImage secondProcessed = new ProcessedImage(ImageFormat.JPEG, new byte[] {4});
        CountDownLatch storageStarted = new CountDownLatch(1);
        CountDownLatch releaseStorage = new CountDownLatch(1);
        given(processor.process(first, ImagePurpose.FEEDBACK)).willReturn(firstProcessed);
        given(processor.process(second, ImagePurpose.FEEDBACK)).willReturn(secondProcessed);
        willAnswer(invocation -> {
            storageStarted.countDown();
            releaseStorage.await();
            return null;
        }).given(imageRepository).save(any(UUID.class), eq(ImagePurpose.FEEDBACK), eq(firstProcessed));

        try (ExecutorService executor = Executors.newSingleThreadExecutor()) {
            Future<List<UUID>> active = executor.submit(() -> service.upload(List.of(first), ImagePurpose.FEEDBACK));
            storageStarted.await();

            try {
                assertThat(service.upload(List.of(second), ImagePurpose.FEEDBACK)).hasSize(1);
            } finally {
                releaseStorage.countDown();
            }
            assertThat(active.get()).hasSize(1);
        }
    }

    private static PendingImage pendingOf(UUID id) {
        return argThat(image -> image.id().equals(id) && image.purpose() == ImagePurpose.FEEDBACK);
    }

}
