package com.poudy.productview.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.product.domain.Product;
import com.poudy.product.repository.ProductRepository;
import com.poudy.productview.repository.ProductViewRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

@Service
public class ProductViewService {

    private static final int MAX_RANKING_SIZE = 6;

    private final ProductRepository productRepository;
    private final ProductViewRepository productViewRepository;
    private final Clock productViewClock;

    public ProductViewService(
        ProductRepository productRepository,
        ProductViewRepository productViewRepository,
        @Qualifier("productViewClock") Clock productViewClock
    ) {
        this.productRepository = productRepository;
        this.productViewRepository = productViewRepository;
        this.productViewClock = productViewClock.withZone(ZoneId.of("Asia/Seoul"));
    }

    public void increaseViewCount(Long productId) {
        if (productRepository.findAll().findById(productId).isEmpty()) {
            throw new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND);
        }
        productViewRepository.increaseViewCount(productId, LocalDate.now(productViewClock));
    }

    public Map<Long, Long> sumViewCounts(Integer days) {
        return productViewRepository.sumViewCounts(LocalDate.now(productViewClock), days);
    }

    public List<Product> findRankings(List<Long> categoryIds, Integer days) {
        Map<Long, Long> viewCounts = sumViewCounts(days);
        return productRepository.findAll().rankByViewCounts(categoryIds, viewCounts, MAX_RANKING_SIZE);
    }
}
