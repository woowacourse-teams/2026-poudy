package com.poudy.config;

import com.poudy.category.domain.Categories;
import com.poudy.category.repository.CategoryRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CategoryConfig {

    @Bean
    public Categories categories(CategoryRepository categoryRepository) {
        return categoryRepository.findAll();
    }
}
