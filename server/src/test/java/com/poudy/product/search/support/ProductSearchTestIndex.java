package com.poudy.product.search.support;

import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;

public final class ProductSearchTestIndex {
    private ProductSearchTestIndex() {
    }

    public static void rebuild(JdbcTemplate jdbc) {
        jdbc.execute((ConnectionCallback<Void>) connection -> {
            new ProductSearchIndexer().rebuild(connection);
            return null;
        });
    }
}
