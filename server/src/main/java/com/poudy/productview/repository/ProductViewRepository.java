package com.poudy.productview.repository;

import com.poudy.productview.domain.ProductViews;
import java.io.IOException;
import java.time.LocalDate;
import java.util.Map;

public class ProductViewRepository {

    private final ProductViews productViews;
    private final ProductViewFileRepository productViewFileRepository;
    private final Object stateLock = new Object();
    private final Object saveLock = new Object();
    private long revision;
    private long savedRevision;

    private ProductViewRepository(ProductViews productViews, ProductViewFileRepository productViewFileRepository) {
        this.productViews = productViews;
        this.productViewFileRepository = productViewFileRepository;
    }

    public static ProductViewRepository restore(ProductViewFileRepository productViewFileRepository)
        throws IOException {
        ProductViews productViews = productViewFileRepository.load();
        return new ProductViewRepository(productViews, productViewFileRepository);
    }

    public void increaseViewCount(Long productId, LocalDate date) {
        synchronized (stateLock) {
            productViews.increaseViewCount(productId, date);
            revision++;
        }
    }

    public Map<Long, Long> sumViewCounts(LocalDate today, Integer days) {
        ProductViews snapshot;
        synchronized (stateLock) {
            snapshot = productViews.copy();
        }
        return snapshot.sumViewCounts(today, days);
    }

    public void saveChanges() throws IOException {
        synchronized (saveLock) {
            ProductViews snapshot;
            long snapshotRevision;
            synchronized (stateLock) {
                if (revision == savedRevision) {
                    return;
                }
                snapshot = productViews.copy();
                snapshotRevision = revision;
            }
            productViewFileRepository.save(snapshot);
            savedRevision = snapshotRevision;
        }
    }
}
