package com.poudy.searchkeyword.repository;

import com.poudy.exception.InfrastructureException;
import com.poudy.searchkeyword.domain.ImprovementReport;
import com.poudy.searchkeyword.domain.ReportItem;
import com.poudy.searchkeyword.domain.ReportSection;
import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.LinkedHashMap;
import java.util.Map;
import tools.jackson.databind.json.JsonMapper;

/** Opt-in local file, restricted to the service account; no web endpoint or query logging. */
public final class KeywordReportRepository {
    private final Path file;

    public KeywordReportRepository(Path file) {
        this.file = file;
    }

    public void save(ImprovementReport report) {
        try {
            Files.createDirectories(file.getParent());
            // POSIX is required for this explicitly enabled operational export.
            Files.setPosixFilePermissions(file.getParent(), PosixFilePermissions.fromString("rwx------"));
            Path temporary = Files.createTempFile(
                file.getParent(),
                ".keyword-report-",
                ".tmp",
                PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------"))
            );
            try {
                JsonMapper.builder().build().writeValue(temporary.toFile(), documentOf(report));
                Files.move(temporary, file, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            } finally {
                Files.deleteIfExists(temporary);
            }
        } catch (IOException exception) {
            throw new InfrastructureException("검색어 개선 보고서를 저장하지 못했습니다: " + file, exception);
        }
    }

    public void discardPrevious() {
        try {
            Files.deleteIfExists(file);
        } catch (IOException exception) {
            throw new InfrastructureException("이전 검색어 개선 보고서를 지우지 못했습니다: " + file, exception);
        }
    }

    private static Map<String, Object> documentOf(ImprovementReport report) {
        Map<String, Object> document = new LinkedHashMap<>();
        document.put("dictionaryVersion", report.dictionaryVersion());
        document.put("catalogVersion", report.catalogVersion());
        document.put("searchVersion", report.searchVersion());
        document.put("nonzeroUnresolved", sectionOf(report.nonzeroUnresolved()));
        document.put("shadowRanking", report.shadowRanking().stream().map(KeywordReportRepository::rankingOf).toList());
        return document;
    }

    private static Map<String, Object> sectionOf(ReportSection section) {
        Map<String, Object> document = new LinkedHashMap<>();
        document.put("windowStart", section.windowStart());
        document.put("observedThrough", section.observedThrough());
        document.put("startedAt", section.startedAt());
        document.put("clockRegressed", section.clockRegressed());
        document.put("items", section.items().stream().map(KeywordReportRepository::itemOf).toList());
        return document;
    }

    private static Map<String, Object> itemOf(ReportItem item) {
        Map<String, Object> document = new LinkedHashMap<>();
        document.put("normalizedQuery", item.normalizedQuery());
        document.put("count", item.count());
        return document;
    }

    private static Map<String, Object> rankingOf(RankedKeyword keyword) {
        Map<String, Object> document = new LinkedHashMap<>();
        document.put("rank", keyword.rank());
        document.put("keyword", keyword.keyword());
        return document;
    }
}
