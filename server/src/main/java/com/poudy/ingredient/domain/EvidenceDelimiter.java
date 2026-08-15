package com.poudy.ingredient.domain;

enum EvidenceDelimiter {

    SEMICOLON(";"),
    SEMICOLON_OR_LINE_BREAK(";\n\r");

    private final String boundaries;

    EvidenceDelimiter(String boundaries) {
        this.boundaries = boundaries;
    }

    boolean isBoundary(char character) {
        return boundaries.indexOf(character) >= 0;
    }
}
