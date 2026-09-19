package com.poudy.productview.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.productview.domain.ViewPeriod;
import java.time.LocalDate;
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
@DisplayName("제품 조회수 저장소")
class ProductViewRepositoryTest {

    private static final LocalDate TODAY = LocalDate.of(2000, 6, 15);

    @Autowired
    private ProductViewRepository productViewRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("날짜별로 기록하고 오늘을 포함한 기간의 조회수를 합산한다")
    void increasesByDateAndSumsPeriodIncludingToday() {
        Map<Long, Long> before = productViewRepository.sumAllViewCounts();
        productViewRepository.increaseViewCount(1L, LocalDate.of(1999, 1, 1));
        productViewRepository.increaseViewCount(1L, TODAY.minusDays(7));
        productViewRepository.increaseViewCount(1L, TODAY.minusDays(6));
        productViewRepository.increaseViewCount(1L, TODAY.minusDays(1));
        productViewRepository.increaseViewCount(1L, TODAY);
        productViewRepository.increaseViewCount(7L, TODAY);
        productViewRepository.increaseViewCount(7L, TODAY);

        assertThat(productViewRepository.sumViewCounts(ViewPeriod.recentDays(TODAY, 1)))
            .containsExactlyInAnyOrderEntriesOf(Map.of(1L, 1L, 7L, 2L));
        assertThat(productViewRepository.sumViewCounts(ViewPeriod.recentDays(TODAY, 7)))
            .containsExactlyInAnyOrderEntriesOf(Map.of(1L, 3L, 7L, 2L));
        assertThat(productViewRepository.sumViewCounts(ViewPeriod.recentDays(TODAY, Integer.MAX_VALUE)))
            .containsExactlyInAnyOrderEntriesOf(Map.of(1L, 5L, 7L, 2L));
        assertThat(productViewRepository.sumAllViewCounts())
            .containsEntry(1L, before.getOrDefault(1L, 0L) + 5)
            .containsEntry(7L, before.getOrDefault(7L, 0L) + 2);
    }

    @Test
    @DisplayName("기간 합산은 미래 날짜를 빼고 전체 합산은 포함한다")
    void boundedPeriodExcludesFutureDatesAndAllTimeIncludesThem() {
        Map<Long, Long> before = productViewRepository.sumAllViewCounts();
        productViewRepository.increaseViewCount(10L, TODAY.plusDays(1));

        assertThat(productViewRepository.sumViewCounts(ViewPeriod.recentDays(TODAY, 7))).doesNotContainKey(10L);
        assertThat(productViewRepository.sumAllViewCounts())
            .containsEntry(10L, before.getOrDefault(10L, 0L) + 1);
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    @DisplayName("동시에 들어온 조회를 빠짐없이 기록한다")
    void recordsConcurrentIncreasesWithoutLoss() throws Exception {
        LocalDate date = LocalDate.of(1998, 1, 1);
        List<Callable<Void>> increases = IntStream.range(0, 50)
            .mapToObj(ignored -> (Callable<Void>) () -> {
                productViewRepository.increaseViewCount(13L, date);
                return null;
            })
            .toList();
        ExecutorService executor = Executors.newFixedThreadPool(8);
        try {
            executor.invokeAll(increases).forEach(ProductViewRepositoryTest::awaitResult);

            assertThat(productViewRepository.sumViewCounts(ViewPeriod.recentDays(date, 1))).containsEntry(13L, 50L);
        } finally {
            executor.shutdownNow();
            jdbcTemplate.update("delete from product_daily_view where view_date = ?", date);
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
