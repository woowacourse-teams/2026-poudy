package com.poudy.ingredient.domain;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.tag.domain.TagCategory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("성분 태그")
class IngredientTagTest {

    @Test
    @DisplayName("근거가 보류된 태그 매핑은 거부한다")
    void rejectsDeferredTagMapping() {
        assertThatThrownBy(
                () -> new IngredientTag(
                        "SOOTHING_RELATED",
                        TagCategory.BIOLOGICAL_EFFECT,
                        "확인된 근거; 태그 보류 — 명확한 근거를 확인하지 못함"))
                .isInstanceOf(DeferredTagEvidenceException.class).hasMessage("근거가 보류된 태그는 매핑할 수 없습니다.");
    }

    @Test
    @DisplayName("줄바꿈 뒤에 근거가 보류된 태그 매핑도 거부한다")
    void rejectsLineSeparatedDeferredTagMapping() {
        assertThatThrownBy(
                () -> new IngredientTag(
                        "SOOTHING_RELATED",
                        TagCategory.BIOLOGICAL_EFFECT,
                        "확인된 근거\n태그 보류 — 명확한 근거를 확인하지 못함"))
                .isInstanceOf(DeferredTagEvidenceException.class).hasMessage("근거가 보류된 태그는 매핑할 수 없습니다.");
    }
}
