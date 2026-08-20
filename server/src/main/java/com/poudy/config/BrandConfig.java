package com.poudy.config;

import com.poudy.brand.domain.Brands;
import com.poudy.brand.repository.BrandRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class BrandConfig {

    @Bean
    public Brands brands(BrandRepository brandRepository) {
        return brandRepository.findAll();
    }
}
