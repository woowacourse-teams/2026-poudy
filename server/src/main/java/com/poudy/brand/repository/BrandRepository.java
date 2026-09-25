package com.poudy.brand.repository;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.Brands;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.SqlArrayValue;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
public class BrandRepository {

    private static final String COLUMNS = "select id, korean_name, english_name, image_url from brand";
    private static final RowMapper<Brand> BRAND = (rs, row) -> new Brand(
        rs.getLong("id"),
        rs.getString("korean_name"),
        rs.getString("english_name"),
        rs.getString("image_url")
    );

    private final NamedParameterJdbcTemplate jdbc;

    public BrandRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Brands findAll() {
        return Brands.from(jdbc.query(COLUMNS + " order by id", BRAND));
    }

    public Optional<Brand> findById(Long id) {
        return jdbc.query(COLUMNS + " where id = :id", Map.of("id", id), BRAND).stream().findFirst();
    }

    public List<Brand> findAllByIdOrderByName(List<Long> ids) {
        return jdbc.query(
            COLUMNS + " where id = any(:ids) order by korean_name collate \"C\", id",
            Map.of("ids", new SqlArrayValue("bigint", ids.toArray())),
            BRAND
        );
    }
}
