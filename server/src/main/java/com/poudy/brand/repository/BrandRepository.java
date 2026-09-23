package com.poudy.brand.repository;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.Brands;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
public class BrandRepository {
    private final JdbcTemplate jdbc;

    public BrandRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Brands findAll() {
        return Brands.from(
            jdbc.query(
                "select id, korean_name, english_name, image_url from brand order by id",
                (rs, row) -> new Brand(
                    rs.getLong("id"),
                    rs.getString("korean_name"),
                    rs.getString("english_name"),
                    rs.getString("image_url")
                )
            )
        );
    }

    public Optional<Brand> findById(Long id) {
        return jdbc.query(
            "select id, korean_name, english_name, image_url from brand where id = ?",
            (rs, row) -> new Brand(
                rs.getLong("id"),
                rs.getString("korean_name"),
                rs.getString("english_name"),
                rs.getString("image_url")
            ),
            id
        ).stream().findFirst();
    }
}
