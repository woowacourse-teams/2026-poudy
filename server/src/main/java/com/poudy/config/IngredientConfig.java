package com.poudy.config;

import com.poudy.ingredient.domain.IngredientCatalog;
import com.poudy.ingredient.repository.IngredientRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class IngredientConfig {

    @Bean
    public IngredientCatalog ingredients(IngredientRepository ingredientRepository) {
        return ingredientRepository.findAll();
    }
}
