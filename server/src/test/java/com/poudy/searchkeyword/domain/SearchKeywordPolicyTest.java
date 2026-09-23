package com.poudy.searchkeyword.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.searchkeyword.domain.bucket.BucketWindow;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.support.CronExpression;

class SearchKeywordPolicyTest {

    @Test
    void refreshesAtEveryBucketStart() {
        BucketWindow window = new BucketWindow(
            SearchKeywordPolicy.RANKING_HOURS,
            SearchKeywordPolicy.BUCKET_SECONDS,
            SearchKeywordPolicy.COMPARISON_BUCKETS
        );
        CronExpression cron = CronExpression.parse(SearchKeywordPolicy.REFRESH_CRON);
        LocalDateTime start = LocalDateTime.parse("2026-09-11T10:30:00");

        LocalDateTime next = cron.next(start);
        LocalDateTime afterNext = cron.next(next);

        assertThat(next).isEqualTo(start.plusSeconds(SearchKeywordPolicy.BUCKET_SECONDS));
        assertThat(afterNext).isEqualTo(next.plusSeconds(SearchKeywordPolicy.BUCKET_SECONDS));
        assertThat(window.isStart(next.toInstant(ZoneOffset.UTC))).isTrue();
    }
}
