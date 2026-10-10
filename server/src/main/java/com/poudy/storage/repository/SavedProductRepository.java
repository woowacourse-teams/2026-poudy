package com.poudy.storage.repository;

import java.util.List;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SavedProductRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public SavedProductRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Long> findProductIds(long memberId) {
        return jdbc.queryForList(
            """
                select product_id
                from member_saved_product
                where member_id = :memberId
                order by created_at desc, product_id desc
                """,
            new MapSqlParameterSource("memberId", memberId),
            Long.class
        );
    }

    public void save(long memberId, long productId) {
        jdbc.update(
            """
                insert into member_saved_product (member_id, product_id)
                values (:memberId, :productId)
                on conflict (member_id, product_id) do nothing
                """,
            parameters(memberId, productId)
        );
    }

    public void delete(long memberId, long productId) {
        jdbc.update(
            "delete from member_saved_product where member_id = :memberId and product_id = :productId",
            parameters(memberId, productId)
        );
    }

    private MapSqlParameterSource parameters(long memberId, long productId) {
        return new MapSqlParameterSource()
            .addValue("memberId", memberId)
            .addValue("productId", productId);
    }
}
