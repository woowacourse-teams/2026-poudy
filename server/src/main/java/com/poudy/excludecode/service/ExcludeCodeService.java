package com.poudy.excludecode.service;

import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.excludecode.repository.ExcludeCodeRepository;
import com.poudy.ingredient.domain.ExcludeCode;
import com.poudy.ingredient.service.IngredientGroups;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ExcludeCodeService implements IngredientGroups {

    private final ExcludeCodeRepository excludeCodeRepository;

    public ExcludeCodeService(ExcludeCodeRepository excludeCodeRepository) {
        this.excludeCodeRepository = excludeCodeRepository;
    }

    public ExcludeCodeIngredients findAll() {
        return excludeCodeRepository.findAll();
    }

    @Override
    public List<ExcludeCode> codesOf(Long ingredientId) {
        return excludeCodeRepository.codesOf(ingredientId);
    }
}
