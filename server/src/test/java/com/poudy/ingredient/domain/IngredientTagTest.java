package com.poudy.ingredient.domain;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.tag.domain.Tag;
import com.poudy.tag.domain.TagCategory;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("성분 태그")
class IngredientTagTest {

    @Test
    @DisplayName("근거가 보류된 태그 매핑은 거부한다")
    void rejectsDeferredTagMapping() {
        assertThatThrownBy(
            () -> new IngredientTag(
                new Tag("SOOTHING_RELATED", TagCategory.BIOLOGICAL_EFFECT, "진정 관련"),
                List.of("확인된 근거", "태그 보류 — 명확한 근거를 확인하지 못함")
            )
        )
            .isInstanceOf(DeferredTagEvidenceException.class).hasMessage("근거가 보류된 태그는 매핑할 수 없습니다.");
    }

    @Test
    @DisplayName("FUNCTION 태그만 배합 목적으로 변환할 수 있다")
    void rejectsOtherCategoryForFormulationRole() {
        IngredientTag tag = new IngredientTag(
            new Tag("HYDRATION_RELATED", TagCategory.BIOLOGICAL_EFFECT, "피부 수분 관련"),
            List.of("확인된 근거")
        );

        assertThatThrownBy(tag::formulationRole)
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("배합 목적은 FUNCTION 태그로 만들어야 합니다.");
    }

    @Test
    @DisplayName("BIOLOGICAL_EFFECT 태그만 피부 작용으로 변환할 수 있다")
    void rejectsOtherCategoryForSkinEffect() {
        IngredientTag tag = new IngredientTag(
            new Tag("HUMECTANT", TagCategory.FUNCTION, "습윤제"),
            List.of("확인된 근거")
        );

        assertThatThrownBy(tag::skinEffect)
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("피부 작용은 BIOLOGICAL_EFFECT 태그로 만들어야 합니다.");
    }
}
