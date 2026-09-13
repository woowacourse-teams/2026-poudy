package com.poudy.productview.service;

import com.poudy.productview.repository.ProductViewRepository;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;

public class ProductViewWriter {

    private static final Logger log = LoggerFactory.getLogger(ProductViewWriter.class);

    private final ProductViewRepository productViewRepository;

    public ProductViewWriter(ProductViewRepository productViewRepository) {
        this.productViewRepository = productViewRepository;
    }

    @PreDestroy
    @Scheduled(scheduler = "productViewScheduler", fixedDelayString = "${poudy.product-views.save-interval:PT10S}", initialDelayString = "${poudy.product-views.save-interval:PT10S}")
    public void save() {
        try {
            productViewRepository.saveChanges();
        } catch (IOException | RuntimeException exception) {
            log.error("제품 조회수 저장에 실패했습니다. 다음 저장 시 재시도합니다.", exception);
        }
    }
}
