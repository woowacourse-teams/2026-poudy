package com.poudy.product.controller.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.ingredientgroup.domain.IngredientGroup;
import com.poudy.ingredientgroup.domain.IngredientGroupCatalog;
import com.poudy.product.domain.SkinEffectGroup;
import com.poudy.tag.domain.SkinEffect;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("피부 작용 그룹 응답")
class SkinEffectGroupResponseTest {

    private final SkinEffect hydration = new SkinEffect("HYDRATION_RELATED", "HYDRATION_RELATED", "피부 수분 관련");
    private final Ingredients ingredients = new Ingredients(
        List.of(
            ingredient(1012L, "글리세린"),
            ingredient(3500L, "판테놀"),
            ingredient(7130L, "세라마이드엔피"),
            ingredient(7131L, "세라마이드에이피")
        )
    );

    @Test
    @DisplayName("피부 작용의 ID, 코드, 이름과 성분 ID·이름을 응답으로 변환한다")
    void convertsSkinEffectGroups() {
        SkinEffectGroup group = new SkinEffectGroup(hydration, List.of(1012L, 3500L));

        List<SkinEffectGroupResponse> responses = SkinEffectGroupResponse
            .from(List.of(group), IngredientGroupCatalog.empty(), ingredients);

        assertThat(responses)
            .containsExactly(
                new SkinEffectGroupResponse(
                    "HYDRATION_RELATED",
                    "HYDRATION_RELATED",
                    "피부 수분 관련",
                    List.of(1012L, 3500L),
                    List.of(
                        new SkinEffectItemResponse(null, List.of(new SkinEffectIngredientResponse(1012L, "글리세린"))),
                        new SkinEffectItemResponse(null, List.of(new SkinEffectIngredientResponse(3500L, "판테놀")))
                    )
                )
            );
    }

    @Test
    @DisplayName("같은 성분군에 속한 성분을 하나의 항목으로 묶는다")
    void bundlesIngredientsOfSameGroup() {
        SkinEffectGroup group = new SkinEffectGroup(hydration, List.of(7130L, 3500L, 7131L));
        IngredientGroupCatalog ingredientGroups = new IngredientGroupCatalog(
            List.of(new IngredientGroup("CERAMIDES", "세라마이드 계열", List.of(7131L, 7130L, 7132L)))
        );

        List<SkinEffectGroupResponse> responses = SkinEffectGroupResponse
            .from(List.of(group), ingredientGroups, ingredients);

        assertThat(responses.getFirst().items())
            .containsExactly(
                new SkinEffectItemResponse(
                    new IngredientGroupSummaryResponse("CERAMIDES", "세라마이드 계열"),
                    List.of(
                        new SkinEffectIngredientResponse(7130L, "세라마이드엔피"),
                        new SkinEffectIngredientResponse(7131L, "세라마이드에이피")
                    )
                ),
                new SkinEffectItemResponse(null, List.of(new SkinEffectIngredientResponse(3500L, "판테놀")))
            );
    }

    private Ingredient ingredient(Long id, String koreanName) {
        return new Ingredient(id, koreanName, null, null, null, null, null, null);
    }
}
