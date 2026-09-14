package com.poudy.searchkeyword.logging;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.searchkeyword.domain.BucketWindow;
import com.poudy.searchkeyword.domain.KeywordBuckets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

@ExtendWith(OutputCaptureExtension.class)
class KeywordStoreMonitorTest {

    @Test
    void logsOnlyCountsOfTheStore(CapturedOutput output) {
        KeywordBuckets buckets = new KeywordBuckets(
            Clock.fixed(Instant.parse("2026-09-10T00:00:00Z"), ZoneOffset.UTC),
            new BucketWindow(168, 600, 0)
        );
        KeywordStoreMonitor monitor = new KeywordStoreMonitor(buckets);

        buckets.record("토너");
        monitor.sample();

        assertThat(output)
            .contains("event=search_keyword_store entries=1 keys=1 buckets=1 clockRegressed=false")
            .doesNotContain("토너");
    }
}
