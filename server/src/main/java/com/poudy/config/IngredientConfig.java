package com.poudy.config;

import com.poudy.ingredient.domain.Ingredients;
import com.poudy.ingredient.repository.IngredientRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class IngredientConfig {

    @Bean
    public Ingredients ingredients(IngredientRepository ingredientRepository) {
        return ingredientRepository.findAll();
    }
}
