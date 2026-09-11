package com.poudy.searchkeyword.logging;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.searchkeyword.domain.KeywordBuckets;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class KeywordStoreMonitorTest {

    @Test
    void publishesOnlyFixedCardinalityCountsWithoutDroppedGauge() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        KeywordBuckets buckets = new KeywordBuckets(
            Clock.fixed(Instant.parse("2026-09-10T00:00:00Z"), ZoneOffset.UTC),
            168
        );
        KeywordStoreMonitor monitor = new KeywordStoreMonitor(buckets, "NONZERO", registry);

        buckets.record("토너");
        monitor.sample();

        assertThat(registry.get("poudy.search.entries").tag("store", "NONZERO").gauge().value()).isEqualTo(1.0);
        assertThat(registry.get("poudy.search.keys").tag("store", "NONZERO").gauge().value()).isEqualTo(1.0);
        assertThat(registry.find("poudy.search.dropped").gauge()).isNull();
    }
}
