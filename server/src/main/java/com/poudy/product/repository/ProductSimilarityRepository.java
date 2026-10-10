package com.poudy.product.repository;

import com.poudy.product.domain.Product;
import com.poudy.product.domain.SimilarProduct;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ProductSimilarityRepository {
    private final NamedParameterJdbcTemplate jdbc;
    private final ProductRepository products;

    public ProductSimilarityRepository(NamedParameterJdbcTemplate jdbc, ProductRepository products) {
        this.jdbc = jdbc;
        this.products = products;
    }

    public boolean isCalculated(Long partId) {
        return Boolean.TRUE.equals(
            jdbc.queryForObject(
                "select exists(select 1 from product_similarity_calculation where component_id = :id)",
                Map.of("id", partId),
                Boolean.class
            )
        );
    }

    public List<SimilarProduct> findSimilarProducts(Long partId) {
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
                order by similarity_score desc, product_id limit 3
                """,
            Map.of("id", partId),
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

    private record Match(Long productId, Long partId) {
    }
}
