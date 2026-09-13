package com.poudy.productview.domain;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

public final class ProductViews {

    private final Map<LocalDate, Map<Long, Long>> dailyCounts;

    private ProductViews(Map<LocalDate, Map<Long, Long>> dailyCounts) {
        this.dailyCounts = dailyCounts;
    }

    public static ProductViews from(Map<LocalDate, Map<Long, Long>> dailyCounts) {
        Map<LocalDate, Map<Long, Long>> copiedCounts = new HashMap<>();
        dailyCounts.forEach((date, counts) -> copiedCounts.put(date, new HashMap<>(counts)));
        return new ProductViews(copiedCounts);
    }

    public void increaseViewCount(Long productId, LocalDate date) {
        dailyCounts.computeIfAbsent(date, ignored -> new HashMap<>())
            .merge(productId, 1L, Math::addExact);
    }

    public Map<Long, Long> sumViewCounts(LocalDate today, Integer days) {
        if (days != null && days <= 0) {
            throw new IllegalArgumentException("조회 기간은 양수여야 합니다.");
        }
        LocalDate firstDate = days == null ? LocalDate.MIN : today.minusDays(days.longValue() - 1);
        Map<Long, Long> totalCounts = new HashMap<>();
        dailyCounts.forEach((date, counts) -> {
            if (days == null || !date.isBefore(firstDate) && !date.isAfter(today)) {
                counts.forEach((productId, count) -> totalCounts.merge(productId, count, Math::addExact));
            }
        });
        return Map.copyOf(totalCounts);
    }

    public ProductViews copy() {
        return from(dailyCounts);
    }

    public Map<LocalDate, Map<Long, Long>> dailyCounts() {
        Map<LocalDate, Map<Long, Long>> copiedCounts = new HashMap<>();
        dailyCounts.forEach((date, counts) -> copiedCounts.put(date, Map.copyOf(counts)));
        return Map.copyOf(copiedCounts);
    }
}
