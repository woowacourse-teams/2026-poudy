package com.poudy.searchkeyword.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.searchkeyword.domain.ImprovementReport;
import com.poudy.searchkeyword.domain.KeywordCoverage;
import com.poudy.searchkeyword.domain.ReportItem;
import com.poudy.searchkeyword.domain.ReportSection;
import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class KeywordReportRepositoryTest {

    private static final Instant NOW = Instant.parse("2026-09-10T00:00:00Z");

    @TempDir
    Path directory;

    @Test
    void writesEveryFieldInStableOrderReadableOnlyByTheServiceAccount() throws Exception {
        Path file = directory.resolve("reports/report.json");

        new KeywordReportRepository(file).save(report());

        assertThat(Files.readString(file)).isEqualTo(
            "{\"dictionaryVersion\":\"v1\",\"catalogVersion\":\"catalog\",\"searchVersion\":\"search\","
                + "\"coverage\":{\"total\":40,\"resolved\":10,\"ratio\":0.25,\"distinctKeys\":3},"
                + "\"nonzeroUnresolved\":{\"windowStart\":\"2026-09-03T00:01:00Z\",\"observedThrough\":\"2026-09-10T00:00:00Z\","
                + "\"startedAt\":\"2026-09-09T00:00:00Z\",\"clockRegressed\":false,"
                + "\"items\":[{\"normalizedQuery\":\"없는검색\",\"count\":20}]},"
                + "\"shadowRanking\":[{\"rank\":1,\"keyword\":\"없는검색\"}]}"
        );
        assertThat(Files.getPosixFilePermissions(file)).isEqualTo(PosixFilePermissions.fromString("rw-------"));
        assertThat(Files.getPosixFilePermissions(file.getParent()))
            .isEqualTo(PosixFilePermissions.fromString("rwx------"));
    }

    @Test
    void discardPreviousRemovesAnEarlierReport() throws Exception {
        Path file = directory.resolve("report.json");
        KeywordReportRepository repository = new KeywordReportRepository(file);
        repository.save(report());

        repository.discardPrevious();

        assertThat(file).doesNotExist();
    }

    private static ImprovementReport report() {
        return new ImprovementReport(
            "v1",
            "catalog",
            "search",
            new KeywordCoverage(40, 10, 3),
            new ReportSection(
                Instant.parse("2026-09-03T00:01:00Z"),
                NOW,
                Instant.parse("2026-09-09T00:00:00Z"),
                false,
                List.of(new ReportItem("없는검색", 20))
            ),
            List.of(new RankedKeyword(1, "없는검색"))
        );
    }
}
