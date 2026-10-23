package com.poudy.ingredient.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.excludecode.domain.ExcludeCodeLookup;
import com.poudy.excludecode.domain.ExcludeCodeSummary;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientDetail;
import com.poudy.ingredient.domain.IngredientPage;
import com.poudy.ingredient.domain.IngredientProducts;
import com.poudy.ingredient.domain.IngredientSuggestion;
import com.poudy.ingredient.domain.IngredientSuggestions;
import com.poudy.ingredient.domain.IngredientUsage;
import com.poudy.ingredient.repository.IngredientRepository;
import com.poudy.ingredientgroup.repository.IngredientGroupRepository;
import java.util.List;
import java.util.Map;
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

    public IngredientDetail findDetail(Long ingredientId, int productSize) {
        Ingredient ingredient = ingredientRepository.findById(ingredientId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.INGREDIENT_NOT_FOUND));

        IngredientProducts products = ingredientUsage.productsContaining(ingredientId, productSize);
        return new IngredientDetail(
            ingredient,
            excludeCodeLookup.codesOf(ingredientId),
            products.total(),
            products.items()
        );
    }

    public IngredientPage find(IngredientQuery query, int page, int size) {
        return ingredientRepository.findPage(query.ingredientIds(), query.usedInProducts(), page, size);
    }

    public IngredientSuggestions suggest(String keyword) {
        List<IngredientSuggestion> suggestions = ingredientRepository.suggest(keyword);
        List<Long> ingredientIds = suggestions.stream().map(IngredientSuggestion::ingredientId).toList();
        Map<Long, List<ExcludeCodeSummary>> excludeGroups = excludeCodeLookup.groupsOf(ingredientIds);
        List<IngredientSuggestion> suggestionsWithExcludeGroups = suggestions.stream()
            .map(
                suggestion -> suggestion.withExcludeGroups(
                    excludeGroups.getOrDefault(suggestion.ingredientId(), List.of())
                )
            )
            .toList();
        return new IngredientSuggestions(
            suggestionsWithExcludeGroups,
            ingredientGroupRepository.suggest(keyword)
        );
    }
}
