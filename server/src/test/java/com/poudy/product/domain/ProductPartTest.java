package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.excludecode.domain.ExcludeCodeGroup;
import com.poudy.excludecode.domain.ExcludeCodeIngredient;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientTag;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.tag.domain.Tag;
import com.poudy.tag.domain.TagCategory;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 구성품")
class ProductPartTest {

    @Test
    @DisplayName("같은 피부 작용을 가진 성분을 하나의 그룹으로 묶는다")
    void groupsIngredientsBySkinEffect() {
        ProductPart part = partOf(ingredient(10L, "HYDRATION_RELATED"), ingredient(20L, "HYDRATION_RELATED"));

        assertThat(part.skinEffectGroups()).singleElement()
            .satisfies(group -> {
                assertThat(group.effect().id()).isEqualTo("HYDRATION_RELATED");
                assertThat(group.ingredientIds()).containsExactly(10L, 20L);
            });
    }

    @Test
    @DisplayName("전체 피부 작용 그룹을 연관 성분 수·태그 ID 순으로 정렬하고 대표 그룹은 상위 3개로 제한한다")
    void ordersAllSkinEffectGroupsAndSelectsTopThree() {
        ProductPart part = partOf(
            ingredient(1L, "MOST_RELATED"),
            ingredient(2L, "MOST_RELATED"),
            ingredient(3L, "MOST_RELATED"),
            ingredient(4L, "SECOND_RELATED"),
            ingredient(5L, "SECOND_RELATED"),
            ingredient(6L, "TIED_RELATED"),
            ingredient(7L, "TIED_EARLIER_RELATED")
        );

        assertThat(part.allSkinEffectGroups()).extracting(group -> group.effect().id())
            .containsExactly("MOST_RELATED", "SECOND_RELATED", "TIED_EARLIER_RELATED", "TIED_RELATED");
        assertThat(part.skinEffectGroups())
            .satisfiesExactly(
                group -> {
                    assertThat(group.effect().id()).isEqualTo("MOST_RELATED");
                    assertThat(group.ingredientIds()).containsExactly(1L, 2L, 3L);
                },
                group -> {
                    assertThat(group.effect().id()).isEqualTo("SECOND_RELATED");
                    assertThat(group.ingredientIds()).containsExactly(4L, 5L);
                },
                group -> {
                    assertThat(group.effect().id()).isEqualTo("TIED_EARLIER_RELATED");
                    assertThat(group.ingredientIds()).containsExactly(7L);
                }
            );
    }

    @Test
    @DisplayName("자기 성분 중 제외 성분군에 속한 것이 있을 때만 포함으로 판정한다")
    void judgesExcludeGroupByOwnIngredients() {
        ExcludeCodeGroup fragrance = new ExcludeCodeGroup(
            ExcludeCode.FRAGRANCE_ALLERGENS,
            "향료",
            "향료",
            "설명",
            List.of(new ExcludeCodeIngredient(20L, "향료 성분", null))
        );
        ProductPart serum = partOf(ingredient(10L, "HYDRATION_RELATED"));
        ProductPart cream = partOf(ingredient(10L, "HYDRATION_RELATED"), ingredient(20L, "HYDRATION_RELATED"));

        assertThat(serum.containsIngredientFrom(fragrance)).isFalse();
        assertThat(cream.containsIngredientFrom(fragrance)).isTrue();
    }

    @Test
    @DisplayName("자기 성분 중 제외 성분군에 속한 성분을 성분 순서대로 찾는다")
    void findsOwnIngredientsInExcludeGroup() {
        ExcludeCodeGroup fragrance = new ExcludeCodeGroup(
            ExcludeCode.FRAGRANCE_ALLERGENS,
            "향료",
            "향료",
            "설명",
            List.of(new ExcludeCodeIngredient(20L, "향료 성분", null), new ExcludeCodeIngredient(30L, "향료 성분", null))
        );
        ProductPart serum = partOf(ingredient(10L, "HYDRATION_RELATED"));
        ProductPart cream = partOf(
            ingredient(30L, "HYDRATION_RELATED"),
            ingredient(10L, "HYDRATION_RELATED"),
            ingredient(20L, "HYDRATION_RELATED")
        );

        assertThat(serum.ingredientsIn(fragrance)).isEmpty();
        assertThat(cream.ingredientsIn(fragrance)).extracting(Ingredient::id).containsExactly(30L, 20L);
    }

    @Test
    @DisplayName("자기 성분에 해당 성분이 있는지 판단한다")
    void checksOwnIngredient() {
        ProductPart part = partOf(ingredient(10L, "HYDRATION_RELATED"));

        assertThat(part.containsIngredient(10L)).isTrue();
        assertThat(part.containsIngredient(20L)).isFalse();
    }

    @Test
    @DisplayName("앞 구성품까지 합친 성분 뒤에 자기 성분을 중복 없이 이어 붙인다")
    void combinesOwnIngredientsAfterPreviousParts() {
        Ingredient shared = ingredient(10L, "SHARED");
        Ingredient own = ingredient(20L, "OWN");
        ProductPart part = partOf(own, shared);

        Ingredients combined = part.combineIngredientsWith(new Ingredients(List.of(shared)));

        assertThat(combined.values()).containsExactly(shared, own);
    }

    @Test
    @DisplayName("자기 ID와 같은지 판단한다")
    void matchesOwnId() {
        ProductPart part = new ProductPart(7L, "본품", new Ingredients(List.of()));

        assertThat(part.hasId(7L)).isTrue();
        assertThat(part.hasId(8L)).isFalse();
        assertThat(part.hasId(null)).isFalse();
    }

    private static ProductPart partOf(Ingredient... ingredients) {
        return new ProductPart(1L, null, new Ingredients(List.of(ingredients)));
    }

    private static Ingredient ingredient(Long id, String effect) {
        IngredientTag tag = new IngredientTag(
            new Tag(effect, TagCategory.BIOLOGICAL_EFFECT, "피부 작용"),
            List.of("확인된 근거")
        );
        return Ingredient.create(id, "성분 " + id, null, null, null, null, List.of(tag), null);
    }
}
