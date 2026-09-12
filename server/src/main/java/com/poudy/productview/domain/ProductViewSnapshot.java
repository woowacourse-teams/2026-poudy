package com.poudy.productview.domain;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

public final class ProductViewSnapshot {

    private final long revision;
    private final Map<LocalDate, Map<Long, Long>> dailyCounts;

    public ProductViewSnapshot(long revision, Map<LocalDate, Map<Long, Long>> dailyCounts) {
        this.revision = revision;
        Map<LocalDate, Map<Long, Long>> copy = new HashMap<>();
        dailyCounts.forEach((date, counts) -> copy.put(date, Map.copyOf(counts)));
        this.dailyCounts = Map.copyOf(copy);
    }

    public Map<Long, Long> totals(LocalDate today, Integer days) {
        if (days != null && days <= 0) {
            throw new IllegalArgumentException("조회 기간은 양수여야 합니다.");
        }
        LocalDate first = days == null ? LocalDate.MIN : today.minusDays(days.longValue() - 1);
        Map<Long, Long> totals = new HashMap<>();
        dailyCounts.forEach((date, counts) -> {
            if (days == null || !date.isBefore(first) && !date.isAfter(today)) {
                counts.forEach((id, count) -> totals.merge(id, count, Math::addExact));
            }
        });
        return Map.copyOf(totals);
    }

    public long revision() {
        return revision;
    }

    public Map<LocalDate, Map<Long, Long>> dailyCounts() {
        return dailyCounts;
    }
}
