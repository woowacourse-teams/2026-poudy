package com.poudy.category.repository;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
public class CategoryRepository {
    private final JdbcTemplate jdbc;

    public CategoryRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Categories findAll() {
        return Categories.from(
            jdbc.query(
                "select id, parent_id, name, depth from category order by id",
                (rs, row) -> new Category(
                    rs.getLong("id"),
                    rs.getObject("parent_id", Long.class),
                    rs.getString("name"),
                    rs.getInt("depth")
                )
            )
        );
    }

}
