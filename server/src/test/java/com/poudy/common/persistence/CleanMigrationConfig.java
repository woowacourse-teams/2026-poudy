package com.poudy.common.persistence;

import com.poudy.product.search.support.ProductSearchIndexer;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("test")
public class CleanMigrationConfig {

    @Bean
    public FlywayMigrationStrategy cleanMigrationStrategy() {
        return flyway -> {
            flyway.clean();
            flyway.migrate();
            try (var connection = flyway.getConfiguration().getDataSource().getConnection()) {
                connection.setAutoCommit(false);
                new ProductSearchIndexer().rebuild(connection);
                connection.commit();
            } catch (java.sql.SQLException exception) {
                throw new IllegalStateException("테스트 상품 검색 자료 생성에 실패했습니다.", exception);
            }
        };
    }
}
