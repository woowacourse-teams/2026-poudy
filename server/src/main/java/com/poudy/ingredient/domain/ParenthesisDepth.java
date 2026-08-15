package com.poudy.ingredient.domain;

/**
 * 근거 문자열을 훑는 동안 괄호 깊이를 센다. 논문 저자처럼 괄호 안에 있는 구분자는 같은 출처의
 * 일부이므로, 경계로 볼지는 이 깊이가 정한다.
 */
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
