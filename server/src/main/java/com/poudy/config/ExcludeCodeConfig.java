package com.poudy.config;

import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.ingredient.repository.IngredientRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ExcludeCodeConfig {

    // 제외 성분군과 성분의 매핑은 도메인 지식이지만 성분 데이터를 읽어 와야 세울 수 있다.
    // 도메인이 Repository 를 알지 않도록 조립만 여기서 한다.
    @Bean
    public ExcludeCodeIngredients excludeCodeIngredients(IngredientRepository ingredientRepository) {
        return new ExcludeCodeIngredients(ingredientRepository.findAll());
    }
}
