package com.poudy.common.domain;

public enum NameMatch {

    EXACT,
    PREFIX,
    PARTIAL,
    NONE;

    public boolean isFound() {
        return this != NONE;
    }
}
