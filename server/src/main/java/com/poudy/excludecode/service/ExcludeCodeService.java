package com.poudy.excludecode.service;

import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.excludecode.domain.ExcludeCodes;
import com.poudy.excludecode.domain.IngredientGroups;
import com.poudy.excludecode.repository.ExcludeCodeRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ExcludeCodeService implements IngredientGroups {

    private final ExcludeCodeRepository excludeCodeRepository;

    public ExcludeCodeService(ExcludeCodeRepository excludeCodeRepository) {
        this.excludeCodeRepository = excludeCodeRepository;
    }

    public ExcludeCodes findAll() {
        return excludeCodeRepository.findAll();
    }

    @Override
    public List<ExcludeCode> codesOf(Long ingredientId) {
        return excludeCodeRepository.codesOf(ingredientId);
    }
}
