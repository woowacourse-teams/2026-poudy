package com.poudy.shelf.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.ingredient.domain.Ingredient;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("분석된 성분")
class AnalyzedIngredientTest {

    private static final Ingredient INGREDIENT = Ingredient.create(1L, "성분", null, null, null, null, null, null);

    @Test
    @DisplayName("직전 결과에 새로 생겼어도 필터에 든 성분은 새 성분으로 표시하지 않는다")
    void suppressesNewMarkerForFilteredIngredient() {
        AnalyzedIngredient filtered = new AnalyzedIngredient(INGREDIENT, List.of(), List.of(), List.of(), true, true);
        AnalyzedIngredient unfiltered = new AnalyzedIngredient(
            INGREDIENT,
            List.of(),
            List.of(),
            List.of(),
            false,
            true
        );
        AnalyzedIngredient existing = new AnalyzedIngredient(INGREDIENT, List.of(), List.of(), List.of(), false, false);

        assertThat(filtered.isNew()).isFalse();
        assertThat(unfiltered.isNew()).isTrue();
        assertThat(existing.isNew()).isFalse();
    }

    @Test
    @DisplayName("입력 목록이 바뀌어도 분석 결과의 성분군과 선정 근거를 보존한다")
    void preservesAnalysisMetadata() {
        List<ExcludeCode> groups = new ArrayList<>(List.of(ExcludeCode.DRYING_ALCOHOLS));
        List<IngredientAnalysisReason> reasons = new ArrayList<>(List.of(IngredientAnalysisReason.DRY_SKIN));
        AnalyzedIngredient analyzed = new AnalyzedIngredient(INGREDIENT, groups, reasons, List.of(), false, true);

        groups.clear();
        reasons.clear();

        assertThat(analyzed.groupCodes()).containsExactly(ExcludeCode.DRYING_ALCOHOLS);
        assertThat(analyzed.reasons()).containsExactly(IngredientAnalysisReason.DRY_SKIN);
        assertThat(analyzed.isNew()).isTrue();
    }
}
