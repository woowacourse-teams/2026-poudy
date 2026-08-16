package com.poudy.config;

import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.ingredient.domain.Ingredients;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ExcludeCodeConfig {

    @Bean
    public ExcludeCodeIngredients excludeCodeIngredients(Ingredients ingredients) {
        return new ExcludeCodeIngredients(ingredients);
    }
}
