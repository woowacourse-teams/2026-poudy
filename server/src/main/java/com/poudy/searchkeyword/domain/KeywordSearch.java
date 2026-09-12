package com.poudy.searchkeyword.domain;

@FunctionalInterface
public interface KeywordSearch {

    boolean hasResults(String keyword);
}
