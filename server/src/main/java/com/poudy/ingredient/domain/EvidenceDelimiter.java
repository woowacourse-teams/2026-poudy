package com.poudy.ingredient.domain;

enum EvidenceDelimiter {

    SEMICOLON {
        @Override
        boolean isBoundary(char character) {
            return character == ';';
        }
    },

    SEMICOLON_OR_LINE_BREAK {
        @Override
        boolean isBoundary(char character) {
            return SEMICOLON.isBoundary(character) || character == '\n' || character == '\r';
        }
    };

    abstract boolean isBoundary(char character);
}
