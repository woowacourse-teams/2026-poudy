package com.poudy.searchkeyword.support;

import com.poudy.searchkeyword.domain.bucket.KeywordCountStore;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

public class InMemoryKeywordCountStore implements KeywordCountStore {

    private final TreeMap<Instant, Map<String, Long>> buckets = new TreeMap<>();

    @Override
    public synchronized void increase(Instant bucketStart, String keywordKey) {
        buckets.computeIfAbsent(bucketStart, ignored -> new HashMap<>()).merge(keywordKey, 1L, Math::addExact);
    }

    @Override
    public synchronized Map<String, Long> sumBetween(Instant firstBucketStart, Instant endBucketStart) {
        Map<String, Long> counts = new HashMap<>();
        buckets.subMap(firstBucketStart, true, endBucketStart, false).values()
            .forEach(bucket -> bucket.forEach((key, count) -> counts.merge(key, count, Math::addExact)));
        return counts;
    }

    @Override
    public synchronized Optional<Instant> earliestBucketStart() {
        if (buckets.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(buckets.firstKey());
    }

    @Override
    public synchronized void removeBefore(Instant bucketStart) {
        buckets.headMap(bucketStart).clear();
    }

    public synchronized int bucketCount() {
        return buckets.size();
    }
}
