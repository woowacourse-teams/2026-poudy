package com.poudy.ingredient.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientCatalog;
import com.poudy.ingredient.domain.IngredientPage;
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

    public IngredientPage find(IngredientQuery query, int page, int size) {
        IngredientCatalog ingredients = ingredientRepository.findAll();
        if (query.hasIngredientIds()) {
            ingredients = ingredients.findAllById(query.ingredientIds());
        }
        if (query.usedInProducts()) {
            ingredients = ingredients.retainIds(ingredientUsage.usedIngredientIds());
        }
        return ingredients.page(page, size);
    }

    public List<MatchedIngredient> suggest(String keyword) {
        return ingredientRepository.suggest(keyword);
    }
}
