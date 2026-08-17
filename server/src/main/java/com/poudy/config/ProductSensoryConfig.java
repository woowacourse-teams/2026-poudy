package com.poudy.config;

import com.poudy.product.domain.sensory.HeuristicProductSensoryEstimator;
import com.poudy.product.domain.sensory.ProductSensoryEstimator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ProductSensoryConfig {

    @Bean
    public ProductSensoryEstimator productSensoryEstimator() {
        return new HeuristicProductSensoryEstimator();
    }
}
