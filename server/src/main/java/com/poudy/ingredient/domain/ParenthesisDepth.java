package com.poudy.ingredient.domain;

final class ParenthesisDepth {

    private int depth;

    void accept(char character) {
        if (character == '(') {
            depth++;
            return;
        }

        if (character == ')' && isInside()) {
            depth--;
        }
    }

    boolean isOutside() {
        return depth == 0;
    }

    private boolean isInside() {
        return depth > 0;
    }
}
