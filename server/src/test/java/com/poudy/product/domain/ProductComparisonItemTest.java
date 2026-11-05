package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.excludecode.domain.ExcludeCodeGroup;
import com.poudy.excludecode.domain.ExcludeCodeIngredient;
import com.poudy.excludecode.domain.ExcludeCodes;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientTag;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.tag.domain.SkinEffect;
import com.poudy.tag.domain.Tag;
import com.poudy.tag.domain.TagCategory;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("구성품별 제품 비교 판정")
class ProductComparisonItemTest {

    @Test
    @DisplayName("전체 피부 작용을 제공하고 주의 기준별·내 필터 결과에서 중복 성분을 제거한다")
    void groupsCautionsAndDeduplicatesIngredients() {
        Ingredient first = ingredient(2L);
        Ingredient second = ingredient(1L);
        ProductPart part = new ProductPart(10L, "2제", new Ingredients(List.of(first, second, first)));
        ExcludeCodes codes = new ExcludeCodes(
            List.of(
                group(ExcludeCode.FRAGRANCE_ALLERGENS, 1L, 2L),
                group(ExcludeCode.SULFATES, 2L),
                group(ExcludeCode.DRYING_ALCOHOLS, 3L)
            )
        );

        Category parent = new Category(1L, null, "스킨케어", 0);
        Category child = new Category(2L, 1L, "스킨/토너", 1);
        Product product = mock(Product.class);
        given(product.category()).willReturn(child);
        ProductComparisonItem item = ProductComparisonItem.of(
            product,
            part,
            Categories.from(List.of(parent, child)),
            codes,
            true,
            List.of(2L, 1L)
        );

        assertThat(item.categoryPath()).containsExactly(parent, child);
        assertThat(item.skinEffects()).extracting(SkinEffect::code).containsExactly("A", "B", "C", "D");
        assertThat(item.cautionGroups().get(0).ingredients()).extracting(Ingredient::id).containsExactly(2L, 1L);
        assertThat(item.cautionGroups().get(1).ingredients()).extracting(Ingredient::id).containsExactly(2L);
        assertThat(item.cautionGroups().get(0).contains()).isTrue();
        assertThat(item.cautionGroups().get(2).contains()).isFalse();
        assertThat(item.myFilterIngredients()).extracting(Ingredient::id).containsExactly(2L, 1L);
        assertThat(item.myFilterStatus()).isEqualTo(ProductComparisonFilterStatus.MATCH);
    }

    private Ingredient ingredient(Long id) {
        return Ingredient.create(
            id,
            "성분 " + id,
            null,
            null,
            null,
            null,
            List.of("D", "C", "B", "A").stream()
                .map(code -> new IngredientTag(new Tag(code, TagCategory.BIOLOGICAL_EFFECT, code), List.of("근거")))
                .toList(),
            null
        );
    }

    private ExcludeCodeGroup group(ExcludeCode code, Long... ids) {
        return new ExcludeCodeGroup(
            code,
            code.value(),
            code.value(),
            "설명",
            java.util.Arrays.stream(ids).map(id -> new ExcludeCodeIngredient(id, "성분 " + id, null)).toList()
        );
    }
}
