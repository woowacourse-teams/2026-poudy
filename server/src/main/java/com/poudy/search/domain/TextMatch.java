package com.poudy.search.domain;

import java.util.List;
import java.util.Optional;

public final class TextMatch {

    private final String text;
    private final NameRank rank;
    private final MatchRange range;

    public TextMatch(String text, NameRank rank, MatchRange range) {
        if (text == null || rank == null || range == null) {
            throw new IllegalArgumentException("검색 일치 결과의 값이 필요합니다.");
        }
        if (!rank.isFound() || range.endIndexExclusive() > text.length()) {
            throw new IllegalArgumentException("검색 일치 결과가 원문 범위를 벗어났습니다.");
        }
        this.text = text;
        this.rank = rank;
        this.range = range;
    }

    public String text() {
        return text;
    }

    public NameRank rank() {
        return rank;
    }

    public MatchRange range() {
        return range;
    }

    public static Optional<TextMatch> best(List<SearchableText> candidates, SearchKeyword keyword) {
        TextMatch best = null;
        for (SearchableText candidate : candidates) {
            Optional<TextMatch> found = keyword.findMatch(candidate);
            if (found.isPresent() && isBetterThan(found.get(), best)) {
                best = found.get();
            }
        }
        return Optional.ofNullable(best);
    }

    private static boolean isBetterThan(TextMatch candidate, TextMatch current) {
        return current == null || candidate.rank().isBetterThan(current.rank());
    }
}
