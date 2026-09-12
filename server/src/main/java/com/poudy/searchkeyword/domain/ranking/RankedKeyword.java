package com.poudy.searchkeyword.domain.ranking;

import java.util.Objects;

public final class RankedKeyword {

    private final int rank;
    private final String keyword;
    private final RankingChange change;

    public RankedKeyword(int rank, String keyword) {
        this(rank, keyword, RankingChange.unknown());
    }

    public RankedKeyword(int rank, String keyword, RankingChange change) {
        this.rank = rank;
        this.keyword = keyword;
        this.change = change;
    }

    public int rank() {
        return rank;
    }

    public String keyword() {
        return keyword;
    }

    public RankingChange change() {
        return change;
    }

    @Override
    public boolean equals(Object other) {
        return this == other || other instanceof RankedKeyword compared
            && rank == compared.rank
            && Objects.equals(keyword, compared.keyword)
            && Objects.equals(change, compared.change);
    }

    @Override
    public int hashCode() {
        return Objects.hash(rank, keyword, change);
    }

    @Override
    public String toString() {
        return "RankedKeyword[rank=" + rank + ", keyword=" + keyword + ", change=" + change + "]";
    }
}
