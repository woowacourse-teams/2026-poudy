package com.poudy.common.domain;

public record NameRank(NameMatch match, boolean combined) implements Comparable<NameRank> {

    public static final NameRank NONE = new NameRank(NameMatch.NONE, false);

    public static NameRank of(NameMatch match, SearchableText name) {
        return new NameRank(match, name.combined());
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
