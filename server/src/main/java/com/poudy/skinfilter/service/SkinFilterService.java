package com.poudy.skinfilter.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InvalidRequestException;
import com.poudy.excludecode.domain.ExcludeCodes;
import com.poudy.excludecode.repository.ExcludeCodeRepository;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.ingredient.repository.IngredientRepository;
import com.poudy.skinfilter.domain.SkinFilterIngredient;
import com.poudy.skinfilter.repository.SkinFilterRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SkinFilterService {

    private final SkinFilterRepository skinFilterRepository;
    private final IngredientRepository ingredientRepository;
    private final ExcludeCodeRepository excludeCodeRepository;

    public SkinFilterService(
        SkinFilterRepository skinFilterRepository,
        IngredientRepository ingredientRepository,
        ExcludeCodeRepository excludeCodeRepository
    ) {
        this.skinFilterRepository = skinFilterRepository;
        this.ingredientRepository = ingredientRepository;
        this.excludeCodeRepository = excludeCodeRepository;
    }

    public List<SkinFilterIngredient> findIngredients(long userId) {
        List<Long> ingredientIds = skinFilterRepository.findIngredientIds(userId);
        Ingredients ingredients = ingredientRepository.findInOrder(ingredientIds);
        ExcludeCodes excludeCodes = excludeCodeRepository.findAll();
        return ingredients.values().stream()
            .map(ingredient -> new SkinFilterIngredient(ingredient, excludeCodes.codesOf(ingredient.id())))
            .toList();
    }

    @Transactional
    public void add(long userId, List<Long> ingredientIds) {
        Ingredients ingredients = ingredientRepository.findInOrder(ingredientIds);
        if (!ingredients.containsAll(ingredientIds)) {
            throw new InvalidRequestException(ErrorCode.INVALID_REQUEST_BODY);
        }
        skinFilterRepository.add(userId, ingredientIds);
    }

    @Transactional
    public void remove(long userId, List<Long> ingredientIds) {
        skinFilterRepository.remove(userId, ingredientIds);
    }
}
