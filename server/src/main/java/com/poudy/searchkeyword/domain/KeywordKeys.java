package com.poudy.searchkeyword.domain;

import com.poudy.search.domain.SearchKeyword;

public final class KeywordKeys {

    private static final int MAX_LENGTH = 300;

    private KeywordKeys() {
    }

    public static void requireNormalized(String key) {
        if (key == null || key.isEmpty() || key.length() > MAX_LENGTH || !new SearchKeyword(key).value().equals(key)) {
            throw new IllegalArgumentException("Invalid normalized keyword");
        }
    }
}
