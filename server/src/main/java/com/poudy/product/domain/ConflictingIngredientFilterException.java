package com.poudy.product.domain;

public class ConflictingIngredientFilterException extends IllegalArgumentException {

    public ConflictingIngredientFilterException() {
        super("같은 성분을 포함과 제외에 함께 쓸 수 없습니다.");
    }
}
