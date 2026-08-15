package com.poudy.ingredient.domain;

public final class ParenthesisDepth {

    private int depth;

    public void accept(char character) {
        if (character == '(') {
            depth++;
            return;
        }

        if (character == ')' && isInside()) {
            depth--;
        }
    }

    public boolean isOutside() {
        return depth == 0;
    }

    private boolean isInside() {
        return depth > 0;
    }
}
