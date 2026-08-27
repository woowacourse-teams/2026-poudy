package com.poudy.search.domain;

import java.util.Comparator;
import java.util.List;

public record NameRank(NameMatch match, boolean combined) implements Comparable<NameRank> {

    public static final NameRank NONE = new NameRank(NameMatch.NONE, false);

    public static NameRank of(SearchKeyword keyword, SearchableText name) {
        return of(keyword.match(name), name);
    }

    public static NameRank of(NameMatch match, SearchableText name) {
        return new NameRank(match, name.combined());
    }

    public static NameRank best(List<SearchableText> names, SearchKeyword keyword) {
        return names.stream()
                .map(name -> of(keyword, name))
                .min(Comparator.naturalOrder())
                .orElse(NONE);
    }

    public boolean isFound() {
        return match.isFound();
    }

    public boolean isBetterThan(NameRank other) {
        return compareTo(other) < 0;
    }

    @Override
    public int compareTo(NameRank other) {
        int byMatch = match.compareTo(other.match);
        if (byMatch != 0) {
            return byMatch;
        }

        return Boolean.compare(combined, other.combined);
    }
}
