package com.poudy.config;

import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.excludecode.repository.ExcludeCodeRepository;
import com.poudy.ingredient.domain.IngredientCatalog;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ExcludeCodeConfig {

    @Bean
    public ExcludeCodeIngredients excludeCodeIngredients(
        ExcludeCodeRepository excludeCodeRepository,
        IngredientCatalog ingredients
    ) {
        return ExcludeCodeIngredients.from(excludeCodeRepository.findAll(), ingredients);
    }
}
