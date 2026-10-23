package com.poudy.myfilter.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InvalidRequestException;
import com.poudy.excludecode.domain.ExcludeCodes;
import com.poudy.excludecode.repository.ExcludeCodeRepository;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.ingredient.repository.IngredientRepository;
import com.poudy.myfilter.domain.MyFilterIngredient;
import com.poudy.myfilter.repository.MyFilterRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MyFilterService {

    private final MyFilterRepository myFilterRepository;
    private final IngredientRepository ingredientRepository;
    private final ExcludeCodeRepository excludeCodeRepository;

    public MyFilterService(
        MyFilterRepository myFilterRepository,
        IngredientRepository ingredientRepository,
        ExcludeCodeRepository excludeCodeRepository
    ) {
        this.myFilterRepository = myFilterRepository;
        this.ingredientRepository = ingredientRepository;
        this.excludeCodeRepository = excludeCodeRepository;
    }

    public List<MyFilterIngredient> findIngredients(long userId) {
        List<Long> ingredientIds = myFilterRepository.findIngredientIds(userId);
        Ingredients ingredients = ingredientRepository.findInOrder(ingredientIds);
        ExcludeCodes excludeCodes = excludeCodeRepository.findAll();
        return ingredients.values().stream()
            .map(ingredient -> new MyFilterIngredient(ingredient, excludeCodes.codesOf(ingredient.id())))
            .toList();
    }

    @Transactional
    public void add(long userId, List<Long> ingredientIds) {
        Ingredients ingredients = ingredientRepository.findInOrder(ingredientIds);
        if (!ingredients.containsAll(ingredientIds)) {
            throw new InvalidRequestException(ErrorCode.INVALID_REQUEST_BODY);
        }
        myFilterRepository.add(userId, ingredientIds);
    }

    @Transactional
    public void remove(long userId, List<Long> ingredientIds) {
        myFilterRepository.remove(userId, ingredientIds);
    }
}
