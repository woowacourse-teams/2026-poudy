package com.poudy.searchkeyword.service;

@FunctionalInterface
public interface KeywordSearch {

    boolean hasResults(String keyword);
}
