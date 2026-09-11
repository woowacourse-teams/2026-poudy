package com.poudy.searchkeyword.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.poudy.searchkeyword.domain.KeywordBuckets;
import com.poudy.searchkeyword.logging.KeywordResourceMonitor;
import com.poudy.searchkeyword.logging.KeywordStoreMonitor;
import com.poudy.searchkeyword.repository.KeywordSnapshotRepository;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class KeywordMaintenanceTest {

    @Test
    void savesSnapshotAndSwallowsReportFailure() {
        KeywordBuckets buckets = new KeywordBuckets(
            Clock.fixed(Instant.parse("2026-09-11T10:30:00Z"), ZoneOffset.UTC),
            168
        );
        KeywordSnapshotRepository repository = mock(KeywordSnapshotRepository.class);
        KeywordMaintenance maintenance = new KeywordMaintenance(
            new KeywordSnapshotWriter(buckets, repository),
            new KeywordStoreMonitor(buckets, "NONZERO", new SimpleMeterRegistry()),
            new KeywordResourceMonitor(() -> 0L, () -> -1L),
            () -> {
                throw new IllegalStateException("report export failed");
            }
        );

        assertThatCode(maintenance::run).doesNotThrowAnyException();
        verify(repository).save(any());
    }
}
