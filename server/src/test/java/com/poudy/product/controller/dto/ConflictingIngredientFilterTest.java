package com.poudy.product.controller.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("커스텀 제약")
class ConflictingIngredientFilterTest {

    @Test
    @DisplayName("제품 필터 요청에 걸린 문구가 응답에 실을 오류 코드 이름이다")
    void messageNamesErrorCode() {
        ConflictingIngredientFilter constraint = ProductFilterRequest.class
                .getAnnotation(ConflictingIngredientFilter.class);

        assertThat(ErrorCode.from(constraint.message())).contains(ErrorCode.CONFLICTING_INGREDIENT_FILTER);
    }
}
