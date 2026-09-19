package com.poudy.productview.repository;

import com.poudy.productview.domain.ViewPeriod;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ProductViewRepository {

    private static final String INCREASE = "insert into product_daily_view (view_date, product_id, view_count)"
        + " values (?, ?, 1) on conflict (view_date, product_id)"
        + " do update set view_count = product_daily_view.view_count + 1";
    private static final String SUM_ALL = "select product_id, sum(view_count) as view_count from product_daily_view"
        + " group by product_id";
    private static final String SUM_BETWEEN = "select product_id, sum(view_count) as view_count from product_daily_view"
        + " where view_date between ? and ? group by product_id";

    private final JdbcTemplate jdbcTemplate;

    public ProductViewRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void increaseViewCount(Long productId, LocalDate date) {
        jdbcTemplate.update(INCREASE, date, productId);
    }

    public Map<Long, Long> sumAllViewCounts() {
        return viewCounts(SUM_ALL);
    }

    public Map<Long, Long> sumViewCounts(ViewPeriod period) {
        return viewCounts(SUM_BETWEEN, period.firstDate(), period.lastDate());
    }

    private Map<Long, Long> viewCounts(String sql, Object... arguments) {
        Map<Long, Long> counts = new HashMap<>();
        jdbcTemplate.query(
            sql,
            row -> {
                counts.put(row.getLong("product_id"), row.getLong("view_count"));
            },
            arguments
        );
        return Map.copyOf(counts);
    }
}
