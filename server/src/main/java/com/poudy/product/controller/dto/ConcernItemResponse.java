package com.poudy.product.controller.dto;

import com.poudy.ingredient.domain.Ingredients;
import com.poudy.ingredientgroup.domain.IngredientBundle;
import io.swagger.v3.oas.annotations.media.DiscriminatorMapping;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(oneOf = {
        IngredientItemResponse.class,
        IngredientGroupItemResponse.class}, discriminatorProperty = "type", discriminatorMapping = {
                @DiscriminatorMapping(value = "INGREDIENT", schema = IngredientItemResponse.class),
                @DiscriminatorMapping(value = "INGREDIENT_GROUP", schema = IngredientGroupItemResponse.class)})
public sealed interface ConcernItemResponse permits IngredientItemResponse, IngredientGroupItemResponse {

    static ConcernItemResponse from(IngredientBundle item, Ingredients ingredients) {
        if (item.group() == null) {
            var ingredient = ingredients.findById(item.ingredientIds().getFirst()).orElseThrow();
            return new IngredientItemResponse(ingredient.id(), ingredient.koreanName());
        }
        return new IngredientGroupItemResponse(
            item.group().code(),
            item.group().name(),
            SkinEffectIngredientResponse.from(item.ingredientIds(), ingredients)
        );
    }
}
