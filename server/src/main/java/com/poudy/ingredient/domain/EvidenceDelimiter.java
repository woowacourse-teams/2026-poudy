package com.poudy.ingredient.domain;

enum EvidenceDelimiter {

    // 설명 근거의 줄바꿈은 원문의 일부라 경계로 쓰지 않는다.
    SEMICOLON {
        @Override
        boolean isBoundary(char character) {
            return character == ';';
        }
    },

    // 태그 근거는 데이터 변환 과정에서 합쳐진 줄바꿈도 경계로 쓴다.
    SEMICOLON_OR_LINE_BREAK {
        @Override
        boolean isBoundary(char character) {
            return SEMICOLON.isBoundary(character) || character == '\n' || character == '\r';
        }
    };

    abstract boolean isBoundary(char character);
}
