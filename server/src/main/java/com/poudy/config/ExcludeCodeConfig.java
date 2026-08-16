package com.poudy.config;

import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.excludecode.repository.ExcludeCodeRepository;
import com.poudy.ingredient.domain.Ingredients;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ExcludeCodeConfig {

    @Bean
    public ExcludeCodeIngredients excludeCodeIngredients(
            ExcludeCodeRepository excludeCodeRepository,
            Ingredients ingredients) {
        return new ExcludeCodeIngredients(excludeCodeRepository.findAll(), ingredients);
    }
}
