package com.poudy.ingredient.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientDetail;
import com.poudy.ingredient.domain.IngredientPage;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.ingredient.domain.MatchedIngredient;
import com.poudy.ingredient.repository.IngredientRepository;
import com.poudy.product.repository.ProductRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class IngredientService {

    private final IngredientRepository ingredientRepository;
    private final ProductRepository productRepository;
    private final ExcludeCodeIngredients excludeCodeIngredients;

    public IngredientService(
        IngredientRepository ingredientRepository,
        ProductRepository productRepository,
        ExcludeCodeIngredients excludeCodeIngredients
    ) {
        this.ingredientRepository = ingredientRepository;
        this.productRepository = productRepository;
        this.excludeCodeIngredients = excludeCodeIngredients;
    }

    public IngredientDetail findDetail(Long ingredientId) {
        Ingredient ingredient = ingredientRepository.findById(ingredientId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.INGREDIENT_NOT_FOUND));

        return new IngredientDetail(
            ingredient,
            excludeCodeIngredients.codesOf(ingredientId),
            productRepository.countContaining(ingredientId)
        );
    }

    public IngredientPage find(IngredientQuery query, int page, int size) {
        Ingredients ingredients = ingredientRepository.findAll();
        if (query.hasIngredientIds()) {
            ingredients = ingredients.findAllById(query.ingredientIds());
        }
        return ingredients.page(page, size);
    }

    public List<MatchedIngredient> suggest(String keyword) {
        return ingredientRepository.suggest(keyword);
    }
}
