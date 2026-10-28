package com.poudy.product.repository;

import com.poudy.product.domain.Mark;
import com.poudy.product.domain.ProductMarks;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.SqlArrayValue;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class ProductMarkWriter {
    private final NamedParameterJdbcTemplate jdbc;

    public ProductMarkWriter(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void replace(long productId, List<Mark> marks) {
        long categoryId = lock(productId);
        save(productId, categoryId, new ProductMarks(rootCategoryName(categoryId), marks));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void add(long productId, Mark mark) {
        long categoryId = lock(productId);
        ProductMarks updatedMarks = ProductMarks.adding(rootCategoryName(categoryId), loadMarks(productId), mark);
        save(productId, categoryId, updatedMarks);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void changeCategory(long productId, long categoryId) {
        lock(productId);
        ProductMarks marks = new ProductMarks(rootCategoryName(categoryId), loadMarks(productId));
        save(productId, categoryId, marks);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void replace(long productId, long categoryId, List<Mark> marks) {
        lock(productId);
        save(productId, categoryId, new ProductMarks(rootCategoryName(categoryId), marks));
    }

    private long lock(long productId) {
        return jdbc.queryForObject(
            "select category_id from product where id = :id for update",
            Map.of("id", productId),
            Long.class
        );
    }

    private List<Mark> loadMarks(long productId) {
        return jdbc.queryForList(
            "select mark_code from product_mark where product_id = :id",
            Map.of("id", productId),
            String.class
        ).stream().map(Mark::fromCode).toList();
    }

    private String rootCategoryName(long categoryId) {
        return jdbc.queryForObject("""
            select root.name from category child join category root on root.id = child.parent_id
            where child.id = :id and child.depth = 1
            """, Map.of("id", categoryId), String.class);
    }

    private void save(long productId, long categoryId, ProductMarks marks) {
        List<String> codes = marks.codes();
        jdbc.update(
            "delete from product_mark where product_id = :id and mark_code <> all(cast(:codes as text[]))",
            Map.of("id", productId, "codes", new SqlArrayValue("text", codes.toArray()))
        );
        for (String code : codes) {
            jdbc.update(
                "insert into product_mark(product_id, mark_code) values (:id, :code) on conflict do nothing",
                Map.of("id", productId, "code", code)
            );
        }
        jdbc.update("""
            update product set category_id = :category, updated_at = (clock_timestamp() at time zone 'Asia/Seoul')
            where id = :id
            """, Map.of("id", productId, "category", categoryId));
    }
}
