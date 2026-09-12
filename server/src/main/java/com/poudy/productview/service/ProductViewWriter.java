package com.poudy.productview.service;

import com.poudy.productview.domain.ProductViewSnapshot;
import com.poudy.productview.domain.ProductViews;
import com.poudy.productview.repository.ProductViewFileRepository;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;

public class ProductViewWriter {

    private static final Logger log = LoggerFactory.getLogger(ProductViewWriter.class);

    private final ProductViews views;
    private final ProductViewFileRepository repository;
    private long savedRevision;

    public ProductViewWriter(ProductViews views, ProductViewFileRepository repository) {
        this.views = views;
        this.repository = repository;
    }

    @PreDestroy
    @Scheduled(scheduler = "productViewScheduler", fixedDelayString = "${poudy.product-views.save-interval:PT10S}", initialDelayString = "${poudy.product-views.save-interval:PT10S}")
    public synchronized void save() {
        Optional<ProductViewSnapshot> changed = views.changedSince(savedRevision);
        if (changed.isEmpty()) {
            return;
        }
        ProductViewSnapshot snapshot = changed.get();
        try {
            repository.save(snapshot);
            savedRevision = snapshot.revision();
        } catch (IOException | RuntimeException exception) {
            log.error("제품 조회수 저장에 실패했습니다. 다음 저장 시 재시도합니다. revision={}", snapshot.revision(), exception);
        }
    }
}
