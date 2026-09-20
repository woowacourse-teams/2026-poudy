package com.poudy.ingredient.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientPage;
import com.poudy.ingredient.domain.IngredientSuggestion;
import com.poudy.ingredient.repository.IngredientRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
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
        return ingredientRepository.findPage(query.ingredientIds(), query.usedInProducts(), page, size);
    }

    public List<IngredientSuggestion> suggest(String keyword) {
        return ingredientRepository.suggest(keyword);
    }
}
