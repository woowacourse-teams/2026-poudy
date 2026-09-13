package com.poudy.config;

import com.poudy.productview.repository.ProductViewFileRepository;
import com.poudy.productview.repository.ProductViewRepository;
import com.poudy.productview.service.ProductViewWriter;
import java.io.IOException;
import java.nio.file.Path;
import java.time.Clock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

@Configuration
@EnableScheduling
public class ProductViewConfig {

    @Bean(defaultCandidate = false)
    public ThreadPoolTaskScheduler productViewScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("product-views-");
        scheduler.setAwaitTerminationSeconds(20);
        return scheduler;
    }

    @Bean
    public ProductViewFileRepository productViewFileRepository(@Value("${poudy.product-views.file}") String file) {
        if (file.isBlank()) {
            throw new IllegalArgumentException("제품 조회수 저장 경로를 지정해야 합니다.");
        }
        return new ProductViewFileRepository(Path.of(file));
    }

    @Bean
    public ProductViewRepository productViewRepository(ProductViewFileRepository productViewFileRepository)
        throws IOException {
        return ProductViewRepository.restore(productViewFileRepository);
    }

    @Bean
    public Clock productViewClock() {
        return Clock.systemUTC();
    }

    @Bean
    public ProductViewWriter productViewWriter(ProductViewRepository productViewRepository) {
        return new ProductViewWriter(productViewRepository);
    }
}
