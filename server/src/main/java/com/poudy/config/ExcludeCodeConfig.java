package com.poudy.config;

import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.ingredient.repository.IngredientRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ExcludeCodeConfig {

    @Bean
    public ExcludeCodeIngredients excludeCodeIngredients(IngredientRepository ingredientRepository) {
        return new ExcludeCodeIngredients(ingredientRepository.findAll());
    }
}
