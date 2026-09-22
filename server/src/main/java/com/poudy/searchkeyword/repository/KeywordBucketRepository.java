package com.poudy.searchkeyword.repository;

import com.poudy.searchkeyword.domain.KeywordCountStore;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class KeywordBucketRepository implements KeywordCountStore {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private static final String INCREASE = "insert into search_keyword_bucket (bucket_start, keyword_key, hit_count)"
        + " values (?, ?, 1) on conflict (bucket_start, keyword_key)"
        + " do update set hit_count = search_keyword_bucket.hit_count + 1";
    private static final String SUM_BETWEEN = "select keyword_key, sum(hit_count) as hit_count from search_keyword_bucket"
        + " where bucket_start >= ? and bucket_start < ? group by keyword_key";
    private static final String EARLIEST_START = "select min(bucket_start) from search_keyword_bucket";
    private static final String REMOVE_BEFORE = "delete from search_keyword_bucket where bucket_start < ?";

    private final JdbcTemplate jdbcTemplate;

    public KeywordBucketRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void increase(Instant bucketStart, String keywordKey) {
        jdbcTemplate.update(INCREASE, timestampOf(bucketStart), keywordKey);
    }

    @Override
    public Map<String, Long> sumBetween(Instant firstBucketStart, Instant endBucketStart) {
        Map<String, Long> counts = new HashMap<>();
        jdbcTemplate.query(
            SUM_BETWEEN,
            row -> {
                counts.put(row.getString("keyword_key"), row.getLong("hit_count"));
            },
            timestampOf(firstBucketStart),
            timestampOf(endBucketStart)
        );
        return counts;
    }

    @Override
    public Optional<Instant> earliestBucketStart() {
        return Optional.ofNullable(jdbcTemplate.queryForObject(EARLIEST_START, LocalDateTime.class))
            .map(timestamp -> timestamp.atZone(SEOUL).toInstant());
    }

    @Override
    public void removeBefore(Instant bucketStart) {
        jdbcTemplate.update(REMOVE_BEFORE, timestampOf(bucketStart));
    }

    private static LocalDateTime timestampOf(Instant instant) {
        return LocalDateTime.ofInstant(instant, SEOUL);
    }
}
