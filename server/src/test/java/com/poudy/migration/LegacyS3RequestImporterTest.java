package com.poudy.migration;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.poudy.exception.InfrastructureException;
import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackContent;
import com.poudy.feedback.domain.FeedbackPath;
import com.poudy.feedback.domain.FeedbackType;
import com.poudy.feedback.domain.ServiceFeedback;
import com.poudy.feedback.repository.FeedbackRepository;
import com.poudy.feedback.repository.LegacyFeedbackS3Reader;
import com.poudy.productrequest.domain.ProductRequest;
import com.poudy.productrequest.domain.ProductRequestStatus;
import com.poudy.productrequest.repository.LegacyProductRequestS3Reader;
import com.poudy.productrequest.repository.ProductRequestRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

@DisplayName("기존 S3 접수 이력 importer")
class LegacyS3RequestImporterTest {

    private final LegacyFeedbackS3Reader feedbackReader = mock(LegacyFeedbackS3Reader.class);
    private final LegacyProductRequestS3Reader productRequestReader = mock(LegacyProductRequestS3Reader.class);
    private final FeedbackRepository feedbackRepository = mock(FeedbackRepository.class);
    private final ProductRequestRepository productRequestRepository = mock(ProductRequestRepository.class);
    private final PlatformTransactionManager transactionManager = transactionManager();
    private final LegacyS3RequestImporter importer = new LegacyS3RequestImporter(
        feedbackReader,
        productRequestReader,
        feedbackRepository,
        productRequestRepository,
        transactionManager
    );

    @Test
    @DisplayName("없는 이력만 넣어 재실행해도 기존 DB 행을 덮어쓰지 않는다")
    void importsOnlyMissingHistory() {
        Feedback existingFeedback = feedback();
        Feedback newFeedback = feedback();
        ProductRequest existingRequest = productRequest();
        ProductRequest newRequest = productRequest();
        given(feedbackReader.findAll()).willReturn(List.of(existingFeedback, newFeedback));
        given(productRequestReader.findAll()).willReturn(List.of(existingRequest, newRequest));
        given(feedbackRepository.exists(existingFeedback.id())).willReturn(true);
        given(feedbackRepository.exists(newFeedback.id())).willReturn(false);
        given(feedbackRepository.findById(existingFeedback.id())).willReturn(existingFeedback);
        given(feedbackRepository.findById(newFeedback.id())).willReturn(newFeedback);
        given(productRequestRepository.exists(existingRequest.requestId())).willReturn(true);
        given(productRequestRepository.exists(newRequest.requestId())).willReturn(false);
        given(productRequestRepository.findById(existingRequest.requestId())).willReturn(existingRequest);
        given(productRequestRepository.findById(newRequest.requestId())).willReturn(newRequest);

        importer.start();

        verify(feedbackRepository, never()).save(existingFeedback);
        verify(feedbackRepository).save(newFeedback);
        verify(productRequestRepository, never()).save(existingRequest);
        verify(productRequestRepository).save(newRequest);
    }

    @Test
    @DisplayName("같은 ID의 DB 값이 S3 원본과 다르면 전체 이관 트랜잭션을 되돌린다")
    void rollsBackMismatchedHistory() {
        Feedback source = feedback();
        Feedback mismatched = feedback();
        given(feedbackReader.findAll()).willReturn(List.of(source));
        given(productRequestReader.findAll()).willReturn(List.of());
        given(feedbackRepository.exists(source.id())).willReturn(true);
        given(feedbackRepository.findById(source.id())).willReturn(mismatched);

        assertThatThrownBy(importer::start).isInstanceOf(InfrastructureException.class);

        verify(transactionManager).rollback(any());
    }

    @Test
    @DisplayName("같은 ID의 제품 요청 처리 이력이 다르면 전체 이관 트랜잭션을 되돌린다")
    void rollsBackMismatchedProductRequestHistory() {
        ProductRequest source = productRequest();
        ProductRequest mismatched = source.changeStatus(
            ProductRequestStatus.COMPLETED,
            Clock.fixed(Instant.parse("2026-01-02T04:04:05Z"), ZoneOffset.UTC)
        );
        given(feedbackReader.findAll()).willReturn(List.of());
        given(productRequestReader.findAll()).willReturn(List.of(source));
        given(productRequestRepository.exists(source.requestId())).willReturn(true);
        given(productRequestRepository.findById(source.requestId())).willReturn(mismatched);

        assertThatThrownBy(importer::start).isInstanceOf(InfrastructureException.class);

        verify(transactionManager).rollback(any());
    }

    private static PlatformTransactionManager transactionManager() {
        PlatformTransactionManager manager = mock(PlatformTransactionManager.class);
        given(manager.getTransaction(any())).willReturn(mock(TransactionStatus.class));
        return manager;
    }

    private static Feedback feedback() {
        return new Feedback(
            UUID.randomUUID(),
            new ServiceFeedback(FeedbackType.OTHER, FeedbackPath.from(null)),
            new FeedbackContent("충분히 긴 의견 내용입니다."),
            OffsetDateTime.parse("2026-01-02T03:04:05Z")
        );
    }

    private static ProductRequest productRequest() {
        return new ProductRequest(
            UUID.randomUUID(),
            "독도 토너",
            "라운드랩",
            OffsetDateTime.parse("2026-01-02T03:04:05Z")
        );
    }
}
