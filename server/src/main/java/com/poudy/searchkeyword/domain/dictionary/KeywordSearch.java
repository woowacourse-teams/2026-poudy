package com.poudy.searchkeyword.domain.dictionary;

@FunctionalInterface
public interface KeywordSearch {

    boolean hasResults(String keyword);
}
