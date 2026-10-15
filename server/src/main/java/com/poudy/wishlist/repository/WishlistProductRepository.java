package com.poudy.wishlist.repository;

import java.util.List;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class WishlistProductRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public WishlistProductRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Long> findProductIds(long userId) {
        return jdbc.queryForList(
            """
                select product_id
                from user_wishlist_product
                where user_id = :userId
                order by created_at desc, product_id desc
                """,
            new MapSqlParameterSource("userId", userId),
            Long.class
        );
    }

    public void save(long userId, long productId) {
        jdbc.update(
            """
                insert into user_wishlist_product (user_id, product_id)
                values (:userId, :productId)
                on conflict (user_id, product_id) do nothing
                """,
            parameters(userId, productId)
        );
    }

    public void delete(long userId, long productId) {
        jdbc.update(
            "delete from user_wishlist_product where user_id = :userId and product_id = :productId",
            parameters(userId, productId)
        );
    }

    private MapSqlParameterSource parameters(long userId, long productId) {
        return new MapSqlParameterSource()
            .addValue("userId", userId)
            .addValue("productId", productId);
    }
}
