package com.poudy.searchkeyword.domain;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

public interface KeywordCountStore {

    void increase(Instant bucketStart, String keywordKey);

    Map<String, Long> sumBetween(Instant firstBucketStart, Instant endBucketStart);

    Optional<Instant> earliestBucketStart();

    void removeBefore(Instant bucketStart);
}
