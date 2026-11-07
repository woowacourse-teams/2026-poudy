package com.poudy.product.controller.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientTag;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.ingredientgroup.domain.IngredientGroup;
import com.poudy.ingredientgroup.domain.IngredientGroupCatalog;
import com.poudy.product.domain.ProductPart;
import com.poudy.tag.domain.Tag;
import com.poudy.tag.domain.TagCategory;
import jakarta.validation.Validation;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class ConcernGroupResponseTest {

    @Test
    void serializesTypedItemsWithTheSameNamesAndOrderAsFullIngredients() {
        Ingredients ingredients = new Ingredients(List.of(ingredient(3L), ingredient(1L), ingredient(2L)));
        ProductPart part = new ProductPart(1L, null, ingredients);
        var groups = new IngredientGroupCatalog(List.of(new IngredientGroup("GROUP", "성분군", List.of(2L, 3L))));
        var response = ConcernGroupResponse.from(part.concernGroups(groups), ingredients);
        var json = JsonMapper.builder().build().valueToTree(response).get(0);

        assertThat(json.path("code").asString()).isEqualTo("DRYNESS");
        assertThat(json.path("name").asString()).isEqualTo("건조·당김");
        var effect = json.path("effects").get(0);
        assertThat(effect.path("code").asString()).isEqualTo("HYDRATION_RELATED");
        assertThat(effect.path("name").asString()).isEqualTo("서버 효능명");
        assertThat(effect.has("id")).isFalse();
        assertThat(effect.has("ingredientIds")).isFalse();
        assertThat(effect.has("items")).isFalse();
        var group = json.path("items").get(0);
        assertThat(group.toString()).startsWith("{\"type\":\"INGREDIENT_GROUP\",");
        assertThat(group.path("type").asString()).isEqualTo("INGREDIENT_GROUP");
        assertThat(group.path("code").asString()).isEqualTo("GROUP");
        assertThat(group.path("name").asString()).isEqualTo("성분군");
        assertThat(group.path("ingredients").get(0).path("id").asLong()).isEqualTo(3L);
        assertThat(group.path("ingredients").get(1).path("koreanName").asString()).isEqualTo("성분 2");
        assertThat(group.has("ingredientGroup")).isFalse();
        assertThat(group.has("id")).isFalse();
        var single = json.path("items").get(1);
        assertThat(single.toString()).startsWith("{\"type\":\"INGREDIENT\",");
        assertThat(single.path("type").asString()).isEqualTo("INGREDIENT");
        assertThat(single.path("id").asLong()).isEqualTo(1L);
        assertThat(single.path("koreanName").asString()).isEqualTo("성분 1");
        assertThat(single.has("ingredients")).isFalse();
        assertThat(single.has("code")).isFalse();
    }

    @Test
    void validatesRequiredFields() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertThat(validator.validate(new IngredientItemResponse(null, null)))
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactlyInAnyOrder("id", "koreanName");
            assertThat(validator.validate(new IngredientGroupItemResponse(null, null, List.of())))
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactlyInAnyOrder("code", "name");
        }
    }

    private static Ingredient ingredient(Long id) {
        return Ingredient.create(
            id,
            "성분 " + id,
            null,
            null,
            null,
            null,
            List.of(
                new IngredientTag(
                    new Tag("HYDRATION_RELATED", TagCategory.BIOLOGICAL_EFFECT, "서버 효능명"),
                    List.of("근거")
                )
            ),
            null
        );
    }
}
