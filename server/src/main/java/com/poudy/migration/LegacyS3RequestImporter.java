package com.poudy.migration;

import com.poudy.exception.InfrastructureException;
import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.repository.FeedbackRepository;
import com.poudy.feedback.repository.LegacyFeedbackS3Reader;
import com.poudy.productrequest.domain.ProductRequest;
import com.poudy.productrequest.repository.LegacyProductRequestS3Reader;
import com.poudy.productrequest.repository.ProductRequestRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.SmartLifecycle;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Component
@ConditionalOnProperty(name = "poudy.legacy-s3-migration.enabled", havingValue = "true")
public class LegacyS3RequestImporter implements SmartLifecycle {

    private static final Logger log = LoggerFactory.getLogger(LegacyS3RequestImporter.class);

    private final LegacyFeedbackS3Reader feedbackReader;
    private final LegacyProductRequestS3Reader productRequestReader;
    private final FeedbackRepository feedbackRepository;
    private final ProductRequestRepository productRequestRepository;
    private final TransactionTemplate transactionTemplate;
    private boolean running;

    public LegacyS3RequestImporter(
        LegacyFeedbackS3Reader feedbackReader,
        LegacyProductRequestS3Reader productRequestReader,
        FeedbackRepository feedbackRepository,
        ProductRequestRepository productRequestRepository,
        PlatformTransactionManager transactionManager
    ) {
        this.feedbackReader = feedbackReader;
        this.productRequestReader = productRequestReader;
        this.feedbackRepository = feedbackRepository;
        this.productRequestRepository = productRequestRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Override
    public void start() {
        List<Feedback> feedbackSource = feedbackReader.findAll();
        List<ProductRequest> productRequestSource = productRequestReader.findAll();
        ImportSummary summary = transactionTemplate.execute(
            status -> new ImportSummary(
                importFeedbacks(feedbackSource),
                importProductRequests(productRequestSource)
            )
        );
        if (summary == null) {
            throw new InfrastructureException("기존 S3 접수 이력 이관 트랜잭션을 완료하지 못했습니다.");
        }
        running = true;
        log.info(
            "기존 S3 접수 이력을 PostgreSQL로 검증했습니다. feedbackSource={}, feedbackImported={},"
                + " productRequestSource={}, productRequestImported={}",
            summary.feedbacks().source(),
            summary.feedbacks().imported(),
            summary.productRequests().source(),
            summary.productRequests().imported()
        );
    }

    @Override
    public void stop() {
        running = false;
    }

    @Override
    public boolean isRunning() {
        return running;
    }

    @Override
    public int getPhase() {
        return 0;
    }

    private ImportResult importFeedbacks(List<Feedback> source) {
        int imported = 0;
        for (Feedback feedback : source) {
            if (!feedbackRepository.exists(feedback.id())) {
                feedbackRepository.save(feedback);
                imported++;
            }
            if (!feedback.equals(feedbackRepository.findById(feedback.id()))) {
                throw new InfrastructureException("기존 의견과 PostgreSQL 이관 결과가 일치하지 않습니다.");
            }
        }
        return new ImportResult(source.size(), imported);
    }

    private ImportResult importProductRequests(List<ProductRequest> source) {
        int imported = 0;
        for (ProductRequest request : source) {
            if (!productRequestRepository.exists(request.requestId())) {
                productRequestRepository.save(request);
                imported++;
            }
            if (!request.hasSameHistoryAs(productRequestRepository.findById(request.requestId()))) {
                throw new InfrastructureException("기존 제품 등록 요청과 PostgreSQL 이관 결과가 일치하지 않습니다.");
            }
        }
        return new ImportResult(source.size(), imported);
    }

    private record ImportResult(int source, int imported) {
    }

    private record ImportSummary(ImportResult feedbacks, ImportResult productRequests) {
    }
}
