package com.poudy.ingredient.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.excludecode.domain.ExcludeCodeLookup;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientDetail;
import com.poudy.ingredient.domain.IngredientPage;
import com.poudy.ingredient.domain.IngredientSuggestions;
import com.poudy.ingredient.domain.IngredientUsage;
import com.poudy.ingredient.repository.IngredientRepository;
import com.poudy.ingredientgroup.repository.IngredientGroupRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class IngredientService {

    private final IngredientRepository ingredientRepository;
    private final IngredientUsage ingredientUsage;
    private final ExcludeCodeLookup excludeCodeLookup;
    private final IngredientGroupRepository ingredientGroupRepository;

    public IngredientService(
        IngredientRepository ingredientRepository,
        IngredientUsage ingredientUsage,
        ExcludeCodeLookup excludeCodeLookup,
        IngredientGroupRepository ingredientGroupRepository
    ) {
        this.ingredientRepository = ingredientRepository;
        this.ingredientUsage = ingredientUsage;
        this.excludeCodeLookup = excludeCodeLookup;
        this.ingredientGroupRepository = ingredientGroupRepository;
    }

    public IngredientDetail findDetail(Long ingredientId) {
        Ingredient ingredient = ingredientRepository.findById(ingredientId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.INGREDIENT_NOT_FOUND));

        return new IngredientDetail(
            ingredient,
            excludeCodeLookup.codesOf(ingredientId),
            ingredientUsage.countProductsContaining(ingredientId)
        );
    }

    public IngredientPage find(IngredientQuery query, int page, int size) {
        return ingredientRepository.findPage(query.ingredientIds(), query.usedInProducts(), page, size);
    }

    public IngredientSuggestions suggest(String keyword) {
        return new IngredientSuggestions(
            ingredientRepository.suggest(keyword),
            ingredientGroupRepository.suggest(keyword)
        );
    }
}
