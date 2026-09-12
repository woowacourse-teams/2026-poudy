package com.poudy.searchkeyword.logging;

import java.lang.management.GarbageCollectorMXBean;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryUsage;
import java.util.Arrays;
import java.util.List;
import java.util.function.LongSupplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class KeywordResourceMonitor {
    private static final Logger LOG = LoggerFactory.getLogger(KeywordResourceMonitor.class);
    private final MemoryMXBean memory;
    private final List<GarbageCollectorMXBean> collectors;
    private final LongSupplier snapshotFailures;
    private final LongSupplier lastSnapshotSuccessEpochSecond;

    public KeywordResourceMonitor(LongSupplier snapshotFailures, LongSupplier lastSnapshotSuccessEpochSecond) {
        this(
            ManagementFactory.getMemoryMXBean(),
            ManagementFactory.getGarbageCollectorMXBeans(),
            snapshotFailures,
            lastSnapshotSuccessEpochSecond
        );
    }

    public KeywordResourceMonitor(
        MemoryMXBean memory,
        List<GarbageCollectorMXBean> collectors,
        LongSupplier snapshotFailures,
        LongSupplier lastSnapshotSuccessEpochSecond
    ) {
        this.memory = memory;
        this.collectors = List.copyOf(collectors);
        this.snapshotFailures = snapshotFailures;
        this.lastSnapshotSuccessEpochSecond = lastSnapshotSuccessEpochSecond;
    }

    public void sample() {
        MemoryUsage heap = memory.getHeapMemoryUsage();
        long gcCount = knownSum(collectors.stream().mapToLong(GarbageCollectorMXBean::getCollectionCount).toArray());
        long gcTimeMs = knownSum(collectors.stream().mapToLong(GarbageCollectorMXBean::getCollectionTime).toArray());
        LOG.info(
            "event=jvm_resources heapUsedBytes={} heapCommittedBytes={} heapMaxBytes={} "
                + "gcCount={} gcTimeMs={} snapshotFailures={} lastSnapshotSuccessEpochSecond={}",
            heap.getUsed(),
            heap.getCommitted(),
            heap.getMax(),
            gcCount,
            gcTimeMs,
            snapshotFailures.getAsLong(),
            lastSnapshotSuccessEpochSecond.getAsLong()
        );
    }

    private static long knownSum(long[] values) {
        long[] known = Arrays.stream(values).filter(value -> value >= 0).toArray();
        if (known.length == 0) {
            return -1;
        }
        return Arrays.stream(known).reduce(0L, Math::addExact);
    }
}
