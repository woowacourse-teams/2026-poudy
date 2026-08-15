package com.poudy.ingredient.domain;

final class ParenthesisDepth {

    private int depth;

    void accept(char character) {
        if (character == '(') {
            depth++;
            return;
        }

        // 여는 괄호 없이 닫는 괄호만 있는 원문이 깊이를 음수로 만들지 않게 한다.
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
