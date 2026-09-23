package com.poudy.productview.repository;

import java.time.LocalDate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ProductViewRepository {

    private static final String INCREASE = "insert into product_daily_view (view_date, product_id, view_count)"
        + " values (?, ?, 1) on conflict (view_date, product_id)"
        + " do update set view_count = product_daily_view.view_count + 1";

    private final JdbcTemplate jdbcTemplate;

    public ProductViewRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void increaseViewCount(Long productId, LocalDate date) {
        jdbcTemplate.update(INCREASE, date, productId);
    }
}
