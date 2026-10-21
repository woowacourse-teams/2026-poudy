package com.poudy.product.domain;

import com.poudy.search.domain.MatchRange;

public final class RelatedKeyword {

    private final String keyword;
    private final MatchRange match;

    public RelatedKeyword(String keyword, MatchRange match) {
        this.keyword = keyword;
        this.match = match;
    }

    public String keyword() {
        return keyword;
    }

    public int startIndex() {
        return match.startIndex();
    }

    public int endIndexExclusive() {
        return match.endIndexExclusive();
    }
}
