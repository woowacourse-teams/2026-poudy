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
                where user_id = :userId and deleted_at is null
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
                on conflict (user_id, product_id) do update
                set created_at = (now() AT TIME ZONE 'Asia/Seoul'), updated_at = (now() AT TIME ZONE 'Asia/Seoul'),
                    deleted_at = null
                where user_wishlist_product.deleted_at is not null
                """,
            parameters(userId, productId)
        );
    }

    public void delete(long userId, long productId) {
        jdbc.update(
            """
                update user_wishlist_product
                set deleted_at = (now() AT TIME ZONE 'Asia/Seoul'), updated_at = (now() AT TIME ZONE 'Asia/Seoul')
                where user_id = :userId and product_id = :productId and deleted_at is null
                """,
            parameters(userId, productId)
        );
    }

    public boolean restore(long userId, long productId) {
        return jdbc.update(
            """
                update user_wishlist_product
                set deleted_at = null, updated_at = (now() AT TIME ZONE 'Asia/Seoul')
                where user_id = :userId and product_id = :productId and deleted_at is not null
                """,
            parameters(userId, productId)
        ) == 1;
    }

    public boolean contains(long userId, long productId) {
        return Boolean.TRUE.equals(
            jdbc.queryForObject(
                """
                    select exists(select 1 from user_wishlist_product
                        where user_id = :userId and product_id = :productId and deleted_at is null)
                    """,
                parameters(userId, productId),
                Boolean.class
            )
        );
    }

    private MapSqlParameterSource parameters(long userId, long productId) {
        return new MapSqlParameterSource()
            .addValue("userId", userId)
            .addValue("productId", productId);
    }
}
