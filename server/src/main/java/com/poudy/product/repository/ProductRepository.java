package com.poudy.product.repository;

import static java.util.stream.Collectors.toMap;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandProductCount;
import com.poudy.brand.domain.BrandProductCounts;
import com.poudy.category.domain.Categories;
import com.poudy.category.domain.CategoryProductCount;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductCountsByBrand;
import com.poudy.product.domain.ProductCountsByCategory;
import com.poudy.product.domain.ProductNameMatch;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.SqlArrayValue;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ProductRepository {
    private final ProductLoader loader;
    private final NamedParameterJdbcTemplate jdbc;

    public ProductRepository(ProductLoader loader, NamedParameterJdbcTemplate jdbc) {
        this.loader = loader;
        this.jdbc = jdbc;
    }

    public Optional<Product> findById(Long id) {
        return loader.load(List.of(id)).stream().findFirst();
    }

    public List<Product> findAllById(List<Long> ids) {
        return ids == null ? List.of() : loader.load(ids);
    }

    public boolean existsById(Long id) {
        return Boolean.TRUE.equals(
            jdbc.queryForObject(
                "select exists(select 1 from product where id = :id)",
                Map.of("id", id),
                Boolean.class
            )
        );
    }

    public boolean hasSearchResults(String keyword) {
        return Boolean.TRUE.equals(
            jdbc.queryForObject(
                "select total > 0 from search_products(:keyword, 0, 1, 2)",
                Map.of("keyword", keyword),
                Boolean.class
            )
        );
    }

    public long countContainingIngredient(Long ingredientId) {
        if (ingredientId == null) {
            return 0;
        }
        return jdbc.queryForObject(
            "select count(distinct component.product_id) from product_component component"
                + " join product_ingredient ingredient on ingredient.component_id = component.id"
                + " where ingredient.ingredient_id = :id",
            Map.of("id", ingredientId),
            Long.class
        );
    }

    public List<BrandProductCount> productCountsByBrand(List<Brand> brands) {
        Map<Long, Long> counts = jdbc
            .query(
                "select brand_id, count(*) as total from product group by brand_id",
                Map.of(),
                (rs, row) -> Map.entry(rs.getLong("brand_id"), rs.getLong("total"))
            ).stream()
            .collect(toMap(Map.Entry::getKey, Map.Entry::getValue));
        return new ProductCountsByBrand(counts).countsOf(brands);
    }

    public List<CategoryProductCount> productCountsByCategory(Categories categories) {
        return categoryCounts(null).categoriesOf(categories);
    }

    public BrandProductCounts brandProductCountsOf(Brand brand, Categories categories) {
        return new BrandProductCounts(brand, categoryCounts(brand.id()).nonEmptyCategoriesOf(categories));
    }

    private ProductCountsByCategory categoryCounts(Long brandId) {
        Map<Long, Long> counts = jdbc.query(
            """
                select ids.id, count(*) as total from product p join category c on c.id = p.category_id
                cross join lateral (values (c.id), (c.parent_id)) ids(id)
                where cast(:brand as bigint) is null or p.brand_id = :brand group by ids.id
                """,
            new MapSqlParameterSource("brand", brandId),
            (rs, row) -> Map.entry(rs.getLong("id"), rs.getLong("total"))
        ).stream()
            .collect(toMap(Map.Entry::getKey, Map.Entry::getValue));
        return new ProductCountsByCategory(counts);
    }

    public List<Product> findRankings(List<Long> categoryIds, LocalDate firstDate, LocalDate lastDate) {
        var parameters = new MapSqlParameterSource("categories", new SqlArrayValue("bigint", categoryIds.toArray()))
            .addValue("first", firstDate).addValue("last", lastDate);
        List<Long> ids = jdbc.queryForList("""
            select p.id from product p join category c on c.id = p.category_id
            left join product_daily_view v on v.product_id = p.id
                and (cast(:first as date) is null or v.view_date between :first and :last)
            where (cardinality(cast(:categories as bigint[])) = 0
                or c.id = any(:categories) or c.parent_id = any(:categories))
              and exists(select 1 from product_variant pv where pv.product_id = p.id and pv.status = 'active')
            group by p.id order by coalesce(sum(v.view_count), 0) desc, p.id limit 6
            """, parameters, Long.class);
        return loader.load(ids);
    }

    public List<Product> findByBrand(Long brandId) {
        return loader.load(
            jdbc.queryForList(
                "select id from product where brand_id = :id order by id",
                Map.of("id", brandId),
                Long.class
            )
        );
    }

    public List<ProductNameMatch> findByProductName(String keyword, Long brandId) {
        var parameters = new MapSqlParameterSource("keyword", keyword).addValue("brand", brandId);
        var hits = jdbc.query(
            "select * from search_product_names(:keyword, :brand)",
            parameters,
            (rs, row) -> Map.entry(rs.getLong("product_id"), rs.getBoolean("exact_match"))
        );
        Map<Long, Product> products = loader.load(hits.stream().map(Map.Entry::getKey).toList()).stream()
            .collect(toMap(Product::id, product -> product));
        return hits.stream().map(hit -> new ProductNameMatch(products.get(hit.getKey()), hit.getValue())).toList();
    }
}
