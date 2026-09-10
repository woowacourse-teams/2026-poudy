package com.poudy.searchkeyword.logging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.lang.management.GarbageCollectorMXBean;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryUsage;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

@ExtendWith(OutputCaptureExtension.class)
class KeywordResourceMonitorTest {
    @Test
    void distinguishesUnknownGcCountersFromZero() {
        assertThat(KeywordResourceMonitor.knownSum(new long[] {-1, -1})).isEqualTo(-1);
        assertThat(KeywordResourceMonitor.knownSum(new long[] {-1, 3, 4})).isEqualTo(7);
        assertThat(KeywordResourceMonitor.knownSum(new long[] {0, 0})).isZero();
    }

    @Test
    void logsHeapGcAndSnapshotValues(CapturedOutput output) {
        MemoryMXBean memory = mock(MemoryMXBean.class);
        when(memory.getHeapMemoryUsage()).thenReturn(new MemoryUsage(50, 100, 200, 300));
        GarbageCollectorMXBean gc = mock(GarbageCollectorMXBean.class);
        when(gc.getCollectionCount()).thenReturn(2L);
        when(gc.getCollectionTime()).thenReturn(9L);
        new KeywordResourceMonitor(memory, List.of(gc), () -> 3L, () -> 4L).sample();
        assertThat(output).contains(
            "event=jvm_resources",
            "heapUsedBytes=100",
            "heapCommittedBytes=200",
            "heapMaxBytes=300",
            "gcCount=2",
            "gcTimeMs=9",
            "snapshotFailures=3",
            "lastSnapshotSuccessEpochSecond=4"
        );
    }
}
