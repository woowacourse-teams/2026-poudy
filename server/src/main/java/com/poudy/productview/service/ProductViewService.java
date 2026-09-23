package com.poudy.productview.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ViewPeriod;
import com.poudy.product.repository.ProductRepository;
import com.poudy.productview.repository.ProductViewRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ProductViewService {

    private final ProductRepository productRepository;
    private final ProductViewRepository productViewRepository;
    private final Clock clock;

    public ProductViewService(
        ProductRepository productRepository,
        ProductViewRepository productViewRepository,
        Clock clock
    ) {
        this.productRepository = productRepository;
        this.productViewRepository = productViewRepository;
        this.clock = clock.withZone(ZoneId.of("Asia/Seoul"));
    }

    public void increaseViewCount(Long productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND);
        }
        productViewRepository.increaseViewCount(productId, LocalDate.now(clock));
    }

    public List<Product> findRankings(List<Long> categoryIds, Integer days) {
        ViewPeriod period = days == null ? null : ViewPeriod.recentDays(LocalDate.now(clock), days);
        return productRepository.findRankings(
            categoryIds,
            period == null ? null : period.firstDate(),
            period == null ? null : period.lastDate()
        );
    }
}
