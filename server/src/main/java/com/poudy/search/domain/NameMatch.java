package com.poudy.search.domain;

public enum NameMatch {

    EXACT,
    PREFIX,
    PARTIAL,
    NONE;

    public boolean isFound() {
        return this != NONE;
    }
}
