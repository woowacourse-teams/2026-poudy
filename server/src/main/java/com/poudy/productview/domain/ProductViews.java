package com.poudy.productview.domain;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

public final class ProductViews {

    private final Clock clock;
    private final Map<LocalDate, Map<Long, Long>> dailyCounts = new HashMap<>();
    private long revision;

    public ProductViews(Clock clock, ProductViewSnapshot restored) {
        this.clock = clock.withZone(ZoneId.of("Asia/Seoul"));
        restored.dailyCounts().forEach((date, counts) -> dailyCounts.put(date, new HashMap<>(counts)));
    }

    public synchronized void increaseViewCount(Long productId) {
        dailyCounts.computeIfAbsent(LocalDate.now(clock), ignored -> new HashMap<>())
            .merge(productId, 1L, Math::addExact);
        revision++;
    }

    public Map<Long, Long> totals(Integer days) {
        ProductViewSnapshot snapshot;
        LocalDate today;
        synchronized (this) {
            today = LocalDate.now(clock);
            snapshot = snapshot();
        }
        return snapshot.totals(today, days);
    }

    public synchronized Optional<ProductViewSnapshot> changedSince(long savedRevision) {
        if (revision == savedRevision) {
            return Optional.empty();
        }
        return Optional.of(snapshot());
    }

    private ProductViewSnapshot snapshot() {
        return new ProductViewSnapshot(revision, dailyCounts);
    }
}
