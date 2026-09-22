package com.poudy.ingredient.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientCatalog;
import com.poudy.ingredient.domain.IngredientDetail;
import com.poudy.ingredient.domain.IngredientGroups;
import com.poudy.ingredient.domain.IngredientPage;
import com.poudy.ingredient.domain.IngredientUsage;
import com.poudy.ingredient.domain.MatchedIngredient;
import com.poudy.ingredient.repository.IngredientRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class IngredientService {

    private final IngredientRepository ingredientRepository;
    private final IngredientUsage ingredientUsage;
    private final IngredientGroups ingredientGroups;

    public IngredientService(
        IngredientRepository ingredientRepository,
        IngredientUsage ingredientUsage,
        IngredientGroups ingredientGroups
    ) {
        this.ingredientRepository = ingredientRepository;
        this.ingredientUsage = ingredientUsage;
        this.ingredientGroups = ingredientGroups;
    }

    public IngredientDetail findDetail(Long ingredientId) {
        Ingredient ingredient = ingredientRepository.findById(ingredientId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.INGREDIENT_NOT_FOUND));

        return new IngredientDetail(
            ingredient,
            ingredientGroups.codesOf(ingredientId),
            ingredientUsage.countProductsContaining(ingredientId)
        );
    }

    public IngredientPage find(List<Long> ingredientIds, boolean usedInProducts, int page, int size) {
        IngredientCatalog ingredients = ingredientRepository.findAll();
        if (!ingredientIds.isEmpty()) {
            ingredients = ingredients.findAllById(ingredientIds);
        }
        if (usedInProducts) {
            ingredients = ingredients.retainIds(ingredientUsage.usedIngredientIds());
        }
        return ingredients.page(page, size);
    }

    public List<MatchedIngredient> suggest(String keyword) {
        return ingredientRepository.suggest(keyword);
    }
}
