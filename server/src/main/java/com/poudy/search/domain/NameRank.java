package com.poudy.search.domain;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

public final class NameRank implements Comparable<NameRank> {

    public static final NameRank NONE = new NameRank(NameMatch.NONE, false, false);

    private final NameMatch match;
    private final boolean reading;
    private final boolean combined;

    public NameRank(NameMatch match, boolean reading, boolean combined) {
        this.match = Objects.requireNonNull(match);
        this.reading = reading;
        this.combined = combined;
    }

    public NameMatch match() {
        return match;
    }

    public boolean reading() {
        return reading;
    }

    public boolean combined() {
        return combined;
    }

    public static NameRank of(SearchKeyword keyword, SearchableText name) {
        return keyword.rank(name);
    }

    public static NameRank of(NameMatch match, SearchableText name) {
        return new NameRank(match, name.reading(), name.combined());
    }

    public static NameRank ofReading(NameMatch match, SearchableText name) {
        return new NameRank(match, true, name.combined());
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

        int byReading = Boolean.compare(reading, other.reading);
        if (byReading != 0) {
            return byReading;
        }

        return Boolean.compare(combined, other.combined);
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof NameRank that)) {
            return false;
        }
        return match == that.match && reading == that.reading && combined == that.combined;
    }

    @Override
    public int hashCode() {
        return Objects.hash(match, reading, combined);
    }
}
