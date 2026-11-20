package com.poudy.product.repository;

import com.poudy.category.domain.Category;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductPart;
import com.poudy.product.domain.SharedIngredientGroupCandidates;
import com.poudy.product.domain.SimilarProduct;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.SqlArrayValue;
import org.springframework.stereotype.Repository;

@Repository
public class ProductSimilarityRepository {
    private final NamedParameterJdbcTemplate jdbc;
    private final ProductRepository products;

    public ProductSimilarityRepository(NamedParameterJdbcTemplate jdbc, ProductRepository products) {
        this.jdbc = jdbc;
        this.products = products;
    }

    public boolean hasResults(Long partId) {
        return Boolean.TRUE.equals(
            jdbc.queryForObject(
                "select exists(select 1 from product_similarity where component_id = :id)",
                Map.of("id", partId),
                Boolean.class
            )
        );
    }

    public List<SimilarProduct> findSimilarProducts(Long partId, int size) {
        // 판매 상태 확인과 대상 제품 중복 제거를 LIMIT 전에 수행한다.
        List<Match> matches = jdbc.query(
            """
                select product_id, similar_component_id from (
                    select target.product_id, s.similar_component_id, s.similarity_score,
                        row_number() over (partition by target.product_id
                            order by s.similarity_score desc, s.similar_component_id) as position
                    from product_similarity s
                    join product_component source on source.id = s.component_id
                    join product_component target on target.id = s.similar_component_id
                    join product source_product on source_product.id = source.product_id
                    join product target_product on target_product.id = target.product_id
                    where s.component_id = :id and s.similarity_score >= 0.25
                        and source.product_id <> target.product_id
                        and source_product.category_id = target_product.category_id
                        and exists(select 1 from product_variant v
                            where v.product_id = target.product_id and v.status = 'active')
                ) candidates where position = 1
                order by similarity_score desc, product_id limit :size
                """,
            Map.of("id", partId, "size", size),
            (row, number) -> new Match(
                row.getLong("product_id"),
                row.getLong("similar_component_id")
            )
        );
        Map<Long, Product> loaded = products.findAllById(matches.stream().map(Match::productId).toList())
            .stream().collect(Collectors.toMap(Product::id, Function.identity()));
        return matches.stream().map(match -> {
            Product product = loaded.get(match.productId());
            return new SimilarProduct(product, product.findPart(match.partId()).orElseThrow());
        }).toList();
    }

    /**
     * 기준 구성품과 대상 구성품 가운데 하나 이상에 함께 든 성분군을 한 번에 읽는다. 후보 수와 상관없이 쿼리는 하나다.
     * 드문 순서에 쓰는 제품 수는 기준 제품과 같은 카테고리에서 그 성분군의 성분을 하나라도 가진 제품을 센다.
     */
    public SharedIngredientGroupCandidates findSharedIngredientGroupCandidates(
        ProductPart source,
        List<SimilarProduct> items,
        Category category
    ) {
        List<Long> sourceIngredientIds = source.ingredientIds();
        List<Long> targetIngredientIds = items.stream()
            .flatMap(item -> item.ingredientIds().stream())
            .distinct()
            .toList();
        if (sourceIngredientIds.isEmpty() || targetIngredientIds.isEmpty()) {
            return SharedIngredientGroupCandidates.empty();
        }
        List<SharedIngredientGroupCandidates.Candidate> eligibleGroups = jdbc.query(
            """
                select g.code, g.display_name,
                    array(select m.ingredient_id from ingredient_group_ingredient m
                        where m.group_code = g.code and m.ingredient_id = any(:targetIngredientIds)
                    ) as target_ingredient_ids,
                    (select count(distinct pc.product_id) from ingredient_group_ingredient m
                        join product_ingredient pi on pi.ingredient_id = m.ingredient_id
                        join product_component pc on pc.id = pi.component_id
                        join product p on p.id = pc.product_id
                        where m.group_code = g.code and p.category_id = :categoryId
                    ) as product_count
                from ingredient_group g
                where g.code <> all(:excludedCodes) and right(g.code, length(:cautionSuffix)) <> :cautionSuffix
                    and exists(select 1 from ingredient_group_ingredient m
                        where m.group_code = g.code and m.ingredient_id = any(:sourceIngredientIds))
                    and exists(select 1 from ingredient_group_ingredient m
                        where m.group_code = g.code and m.ingredient_id = any(:targetIngredientIds))
                """,
            new MapSqlParameterSource()
                .addValue("sourceIngredientIds", new SqlArrayValue("bigint", sourceIngredientIds.toArray()))
                .addValue("targetIngredientIds", new SqlArrayValue("bigint", targetIngredientIds.toArray()))
                .addValue(
                    "excludedCodes",
                    new SqlArrayValue("text", SharedIngredientGroupCandidates.excludedCodes().toArray())
                )
                .addValue("cautionSuffix", SharedIngredientGroupCandidates.CAUTION_CODE_SUFFIX)
                .addValue("categoryId", category.id()),
            (row, number) -> new SharedIngredientGroupCandidates.Candidate(
                row.getString("code"),
                row.getString("display_name"),
                Set.of((Long[]) row.getArray("target_ingredient_ids").getArray()),
                row.getLong("product_count")
            )
        );
        return SharedIngredientGroupCandidates.rankByRarity(eligibleGroups);
    }

    private record Match(Long productId, Long partId) {
    }
}
