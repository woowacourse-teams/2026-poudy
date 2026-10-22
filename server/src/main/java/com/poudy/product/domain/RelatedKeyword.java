package com.poudy.product.domain;

import com.poudy.search.domain.MatchRange;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.function.Function;

public final class RelatedKeyword {

    private final String keyword;
    private final List<MatchRange> matches;

    private RelatedKeyword(String keyword, List<MatchRange> matches) {
        this.keyword = keyword;
        this.matches = matches;
    }

    public static RelatedKeyword of(String keyword, List<MatchRange> ranges) {
        return new RelatedKeyword(keyword, merge(ranges));
    }

    public String keyword() {
        return keyword;
    }

    public <T> List<T> mapMatches(Function<MatchRange, T> mapper) {
        return matches.stream().map(mapper).toList();
    }

    private static List<MatchRange> merge(List<MatchRange> ranges) {
        List<MatchRange> merged = new ArrayList<>();
        ranges.stream().sorted(Comparator.comparingInt(MatchRange::startIndex)).forEach(range -> {
            if (!merged.isEmpty() && merged.getLast().connectsWith(range)) {
                merged.set(merged.size() - 1, merged.getLast().union(range));
                return;
            }
            merged.add(range);
        });
        return List.copyOf(merged);
    }
}
