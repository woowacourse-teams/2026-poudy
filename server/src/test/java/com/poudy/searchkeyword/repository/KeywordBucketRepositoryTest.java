package com.poudy.searchkeyword.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.IntStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@DisplayName("검색어 칸 저장소")
class KeywordBucketRepositoryTest {

    private static final Instant FIRST = Instant.parse("2020-01-01T10:00:00Z");
    private static final Instant SECOND = FIRST.plusSeconds(600);
    private static final Instant THIRD = SECOND.plusSeconds(600);

    @Autowired
    private KeywordBucketRepository repository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("칸과 검색어마다 횟수를 올리고 시작 칸 이상 끝 칸 미만을 합산한다")
    void increasesAndSumsHalfOpenRange() {
        repository.increase(FIRST, "토너");
        repository.increase(FIRST, "토너");
        repository.increase(SECOND, "토너");
        repository.increase(SECOND, "독도 토너");
        repository.increase(THIRD, "크림");

        assertThat(repository.sumBetween(FIRST, THIRD))
            .containsExactlyInAnyOrderEntriesOf(Map.of("토너", 3L, "독도 토너", 1L));
        assertThat(repository.sumBetween(SECOND, SECOND)).isEmpty();
    }

    @Test
    @DisplayName("가장 이른 칸을 알려주고 기준 칸보다 이른 칸을 지운다")
    void findsEarliestAndRemovesOlderBuckets() {
        jdbcTemplate.update("delete from search_keyword_bucket");
        assertThat(repository.earliestBucketStart()).isEmpty();
        repository.increase(FIRST, "토너");
        repository.increase(SECOND, "크림");
        assertThat(repository.earliestBucketStart()).contains(FIRST);

        repository.removeBefore(SECOND);

        assertThat(repository.earliestBucketStart()).contains(SECOND);
        assertThat(repository.sumBetween(FIRST, THIRD)).containsExactlyInAnyOrderEntriesOf(Map.of("크림", 1L));
    }

    @Test
    @DisplayName("최대 길이의 정규화 입력을 그대로 저장한다")
    void keepsMaximumLengthKey() {
        String maximum = "가".repeat(300);
        repository.increase(FIRST, maximum);

        assertThat(repository.sumBetween(FIRST, SECOND)).containsEntry(maximum, 1L);
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    @DisplayName("동시에 들어온 검색을 빠짐없이 기록한다")
    void recordsConcurrentIncreasesWithoutLoss() throws Exception {
        Instant bucket = Instant.parse("2019-01-01T00:00:00Z");
        List<Callable<Void>> increases = IntStream.range(0, 50)
            .mapToObj(ignored -> (Callable<Void>) () -> {
                repository.increase(bucket, "토너");
                return null;
            })
            .toList();
        ExecutorService executor = Executors.newFixedThreadPool(8);
        try {
            executor.invokeAll(increases).forEach(KeywordBucketRepositoryTest::awaitResult);

            assertThat(repository.sumBetween(bucket, bucket.plusSeconds(600))).containsEntry("토너", 50L);
        } finally {
            executor.shutdownNow();
            jdbcTemplate
                .update("delete from search_keyword_bucket where bucket_start = ?", bucket.atOffset(ZoneOffset.UTC));
        }
    }

    private static void awaitResult(Future<Void> result) {
        try {
            result.get();
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }
}
