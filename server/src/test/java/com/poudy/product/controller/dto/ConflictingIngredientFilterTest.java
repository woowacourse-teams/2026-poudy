package com.poudy.product.controller.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.exception.ErrorCode;
import java.lang.annotation.Annotation;
import java.util.Arrays;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("커스텀 제약")
class ConflictingIngredientFilterTest {

    @Test
    @DisplayName("기본 문구가 응답에 실을 오류 코드 이름이다")
    void defaultMessageNamesErrorCode() {
        assertThat(ErrorCode.from(defaultMessageOf(ConflictingIngredientFilter.class)))
                .contains(ErrorCode.CONFLICTING_INGREDIENT_FILTER);
    }

    private static String defaultMessageOf(Class<? extends Annotation> constraint) {
        return Arrays.stream(constraint.getDeclaredMethods()).filter(method -> "message".equals(method.getName()))
                .map(method -> (String) method.getDefaultValue()).findFirst().orElseThrow();
    }
}
