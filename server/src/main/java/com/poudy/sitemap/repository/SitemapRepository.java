package com.poudy.sitemap.repository;

import com.poudy.sitemap.domain.ContentUpdate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
public class SitemapRepository {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final RowMapper<ContentUpdate> CONTENT_UPDATE = (rs, row) -> new ContentUpdate(
        rs.getLong("id"),
        rs.getObject("updated_at", LocalDateTime.class).atZone(SEOUL).toOffsetDateTime()
    );

    private final JdbcTemplate jdbc;

    public SitemapRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<ContentUpdate> findCategoryUpdates() {
        return jdbc.query(
            """
                select c.id, greatest(c.updated_at, max(p.updated_at)) as updated_at
                from category c
                left join category leaf on leaf.id = c.id or leaf.parent_id = c.id
                left join product p on p.category_id = leaf.id
                group by c.id, c.updated_at
                order by c.id
                """,
            CONTENT_UPDATE
        );
    }

    public List<ContentUpdate> findBrandUpdates() {
        return jdbc.query(
            """
                select b.id, greatest(b.updated_at, max(p.updated_at)) as updated_at
                from brand b
                left join product p on p.brand_id = b.id
                group by b.id, b.updated_at
                order by b.id
                """,
            CONTENT_UPDATE
        );
    }

    public List<ContentUpdate> findPublishedCurationUpdates() {
        return jdbc.query(
            """
                select c.id, greatest(c.updated_at, max(p.updated_at)) as updated_at
                from curation c
                left join lateral (
                    select product_id::bigint as id
                    from jsonb_path_query(c.blocks,
                        '$[*] ? (@.type == "PRODUCTS").productIds[*]') as ids(product_id)
                    union all
                    select product_id::bigint as id
                    from jsonb_path_query(c.blocks,
                        '$[*] ? (@.type == "PRODUCTS_BY_FILTER").products[*].productId') as ids(product_id)
                ) refs on true
                left join product p on p.id = refs.id
                where c.publication_status = 'PUBLISHED'
                group by c.id, c.updated_at
                order by c.id
                """,
            CONTENT_UPDATE
        );
    }

    public List<ContentUpdate> findUsedIngredientUpdates() {
        return jdbc.query(
            """
                select i.id, greatest(i.updated_at, max(p.updated_at)) as updated_at
                from ingredient i
                join product_ingredient pi on pi.ingredient_id = i.id
                join product_component pc on pc.id = pi.component_id
                join product p on p.id = pc.product_id
                group by i.id, i.updated_at
                order by i.id
                """,
            CONTENT_UPDATE
        );
    }
}
