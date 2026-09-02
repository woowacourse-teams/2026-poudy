package com.poudy.config;

import com.poudy.exception.InfrastructureException;
import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.excludecode.domain.InvalidExcludeCodeDefinitionException;
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
        try {
            return ExcludeCodeIngredients.from(excludeCodeRepository.findAll(), ingredients);
        } catch (InvalidExcludeCodeDefinitionException exception) {
            throw new InfrastructureException(exception.getMessage(), exception);
        }
    }
}
