package com.poudy.searchkeyword.domain;

import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import java.util.List;

public final class ImprovementReport {

    private final String dictionaryVersion;
    private final String catalogVersion;
    private final String searchVersion;
    private final KeywordCoverage coverage;
    private final ReportSection nonzeroUnresolved;
    private final List<RankedKeyword> shadowRanking;

    public ImprovementReport(
        String dictionaryVersion,
        String catalogVersion,
        String searchVersion,
        KeywordCoverage coverage,
        ReportSection nonzeroUnresolved,
        List<RankedKeyword> shadowRanking
    ) {
        this.dictionaryVersion = dictionaryVersion;
        this.catalogVersion = catalogVersion;
        this.searchVersion = searchVersion;
        this.coverage = coverage;
        this.nonzeroUnresolved = nonzeroUnresolved;
        this.shadowRanking = List.copyOf(shadowRanking);
    }

    public String dictionaryVersion() {
        return dictionaryVersion;
    }

    public String catalogVersion() {
        return catalogVersion;
    }

    public String searchVersion() {
        return searchVersion;
    }

    public KeywordCoverage coverage() {
        return coverage;
    }

    public ReportSection nonzeroUnresolved() {
        return nonzeroUnresolved;
    }

    public List<RankedKeyword> shadowRanking() {
        return shadowRanking;
    }

}
