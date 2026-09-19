package com.poudy.excludecode.service;

import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.excludecode.repository.ExcludeCodeRepository;
import org.springframework.stereotype.Service;

@Service
public class ExcludeCodeService {

    private final ExcludeCodeRepository excludeCodeRepository;

    public ExcludeCodeService(ExcludeCodeRepository excludeCodeRepository) {
        this.excludeCodeRepository = excludeCodeRepository;
    }

    public ExcludeCodeIngredients findAll() {
        return excludeCodeRepository.findAll();
    }
}
