package com.poudy.productview.repository;

import static java.util.stream.Collectors.toUnmodifiableMap;

import com.poudy.productview.domain.ViewPeriod;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Repository;

@Repository
public class ProductViewRepository {

    private final ProductDailyViewJpaRepository productDailyViewJpaRepository;

    public ProductViewRepository(ProductDailyViewJpaRepository productDailyViewJpaRepository) {
        this.productDailyViewJpaRepository = productDailyViewJpaRepository;
    }

    public void increaseViewCount(Long productId, LocalDate date) {
        productDailyViewJpaRepository.increase(date, productId);
    }

    public Map<Long, Long> sumAllViewCounts() {
        return countsOf(productDailyViewJpaRepository.sumAll());
    }

    public Map<Long, Long> sumViewCounts(ViewPeriod period) {
        return countsOf(productDailyViewJpaRepository.sumBetween(period.firstDate(), period.lastDate()));
    }

    private static Map<Long, Long> countsOf(List<ProductViewCount> counts) {
        return counts.stream().collect(toUnmodifiableMap(ProductViewCount::productId, ProductViewCount::viewCount));
    }
}
