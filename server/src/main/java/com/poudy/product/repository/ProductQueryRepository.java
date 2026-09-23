package com.poudy.product.repository;

import static java.util.stream.Collectors.toMap;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.category.domain.CategoryProductCount;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductFilterOptions;
import com.poudy.product.domain.ProductMatchField;
import com.poudy.product.domain.ProductPage;
import com.poudy.product.domain.ProductQuery;
import com.poudy.product.domain.ProductSort;
import com.poudy.product.domain.ProductSuggestion;
import com.poudy.product.domain.ProductSuggestions;
import com.poudy.search.domain.MatchRange;
import com.poudy.skintype.domain.SkinType;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.SqlArrayValue;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ProductQueryRepository {

    // 검색 결과를 한 번 계산하고 목록, 개수, 각 선택지의 집계가 같은 후보를 공유한다.
    private static final String CANDIDATES = """
        with searched as materialized (%s), candidates as materialized (
            select p.*, c.parent_id,
                (cardinality(cast(:brands as bigint[])) = 0 or p.brand_id = any(:brands)) as brand_ok,
                (cardinality(cast(:categories as bigint[])) = 0
                    or p.category_id = any(:categories) or c.parent_id = any(:categories)) as category_ok,
                (cast(:skin as text) is null or exists (select 1 from product_skin_type s
                    where s.product_id = p.id and s.skin_type_code = :skin)) as skin_ok
            from product p join searched on searched.id = p.id join category c on c.id = p.category_id
            where (cardinality(cast(:moisture as integer[])) = 0 or p.moisture_level = any(:moisture))
              and (cardinality(cast(:oil as integer[])) = 0 or p.oil_level = any(:oil))
              and not exists (select 1 from unnest(cast(:included as bigint[])) wanted(id)
                  where not exists (select 1 from product_component pc
                      join product_ingredient pi on pi.component_id = pc.id
                      where pc.product_id = p.id and pi.ingredient_id = wanted.id))
              and not exists (select 1 from product_component pc
                  join product_ingredient pi on pi.component_id = pc.id where pc.product_id = p.id
                  and (pi.ingredient_id = any(:excluded) or exists (
                      select 1 from exclude_code_ingredient e where e.ingredient_id = pi.ingredient_id
                          and e.exclude_code = any(:codes))))
        ), matched as (select * from candidates where brand_ok and category_ok and skin_ok)
        """;

    private static final String PAGE = """
        , page as (
            select m.id, row_number() over (order by %s, m.id) as position
            from matched m join lateral (select price from product_variant v
                where v.product_id = m.id order by v.display_order limit 1) v on true
            order by %s, m.id limit :size offset :offset
        ), scopes as materialized (
            select p.*, scope.name from candidates p
            cross join lateral (values
                ('MATCH', brand_ok and category_ok and skin_ok),
                ('BRAND_OPTION', :options and category_ok and skin_ok),
                ('CATEGORY_OPTION', :options and brand_ok and skin_ok),
                ('SKIN_OPTION', :options and brand_ok and category_ok)) scope(name, eligible)
            where scope.eligible
        )
        select 'TOTAL' as section, null::text as id, count(*) as amount from matched
        union all select 'PAGE', id::text, position from page
        union all select name || '_BRAND', brand_id::text, count(*) from scopes
            where name in ('MATCH', 'BRAND_OPTION') group by name, brand_id
        union all select name || '_CATEGORY', category.id::text, count(*) from scopes
            cross join lateral (values (category_id), (parent_id)) category(id)
            where name in ('MATCH', 'CATEGORY_OPTION') group by name, category.id
        union all select name || '_SKIN', s.skin_type_code, count(*) from scopes p
            join product_skin_type s on s.product_id = p.id
            where name in ('MATCH', 'SKIN_OPTION') group by name, s.skin_type_code
        """;

    private final NamedParameterJdbcTemplate jdbc;
    private final ProductLoader loader;

    public ProductQueryRepository(NamedParameterJdbcTemplate jdbc, ProductLoader loader) {
        this.jdbc = jdbc;
        this.loader = loader;
    }

    public ProductPage find(ProductQuery query, ProductSort sort, int page, int size) {
        validatePage(page, size);
        MapSqlParameterSource parameters = parameters(query)
            .addValue("size", size).addValue("offset", (long) (page - 1) * size).addValue("options", page == 1);
        String order = switch (ProductSort.orDefault(sort)) {
            case NAME_ASC -> "m.product_name collate \"C\" asc";
            case NAME_DESC -> "m.product_name collate \"C\" desc";
            case PRICE_ASC -> "v.price asc";
            case PRICE_DESC -> "v.price desc";
        };
        List<Aggregate> rows = jdbc.query(
            candidates(query) + PAGE.formatted(order, order),
            parameters,
            (rs, row) -> new Aggregate(rs.getString("section"), rs.getString("id"), rs.getLong("amount"))
        );
        List<Long> ids = rows.stream().filter(r -> r.section().equals("PAGE"))
            .sorted(Comparator.comparingLong(Aggregate::amount)).map(r -> Long.valueOf(r.id())).toList();
        Facets facets = facets(rows);
        long total = rows.stream().filter(r -> r.section().equals("TOTAL")).findFirst().orElseThrow().amount();
        return new ProductPage(
            loader.load(ids),
            total,
            facets.brands("MATCH"),
            facets.categories("MATCH"),
            facets.skinTypes("MATCH"),
            page == 1
                ? new ProductFilterOptions(
                    facets.brands("BRAND_OPTION"),
                    facets.categories("CATEGORY_OPTION"),
                    facets.skinTypes("SKIN_OPTION")
                ) : null
        );
    }

    public long count(ProductQuery query) {
        return jdbc.queryForObject(candidates(query) + " select count(*) from matched", parameters(query), Long.class);
    }

    public ProductSuggestions suggest(String keyword, int page, int size) {
        validatePage(page, size);
        MapSqlParameterSource parameters = new MapSqlParameterSource("keyword", keyword)
            .addValue("offset", (long) (page - 1) * size).addValue("size", size);
        List<SuggestionHit> hits = jdbc.query(
            """
                select result.total,
                (item.value ->> 'productId')::bigint as id,
                item.value ->> 'matchField' as field, item.value ->> 'matchText' as text,
                (item.value -> 'matchRange' ->> 0)::integer as start,
                (item.value -> 'matchRange' ->> 1)::integer as finish from
                search_products(:keyword, :offset, :size, 3) result
                left join lateral jsonb_array_elements(result.items) with ordinality item(value, position) on true
                order by item.position
                """,
            parameters,
            (rs, row) -> new SuggestionHit(
                rs.getLong("total"),
                rs.getObject("id", Long.class),
                rs.getString("field"),
                rs.getString("text"),
                rs.getInt("start"),
                rs.getInt("finish")
            )
        );
        Map<Long, Product> products = loader
            .load(hits.stream().filter(h -> h.id() != null).map(SuggestionHit::id).toList())
            .stream().collect(toMap(Product::id, Function.identity()));
        return new ProductSuggestions(
            hits.stream().filter(h -> h.id() != null).map(
                h -> new ProductSuggestion(
                    products.get(h.id()),
                    ProductMatchField.valueOf(h.field()),
                    h.text(),
                    new MatchRange(h.start(), h.finish())
                )
            )
                .toList(),
            hits.getFirst().total()
        );
    }

    private String candidates(ProductQuery query) {
        String searched = query.hasKeyword() ? """
            select (item ->> 'productId')::bigint as id
            from search_products(:keyword, 0, null, 2) result, jsonb_array_elements(result.items) item
            """ : "select id from product";
        return CANDIDATES.formatted(searched);
    }

    private MapSqlParameterSource parameters(ProductQuery query) {
        return new MapSqlParameterSource("keyword", query.keyword())
            .addValue("brands", array("bigint", query.brandIds()))
            .addValue("categories", array("bigint", query.categoryIds()))
            .addValue("moisture", array("integer", query.moistureLevels()))
            .addValue("oil", array("integer", query.oilLevels()))
            .addValue("included", array("bigint", query.includeIngredientIds()))
            .addValue("excluded", array("bigint", query.excludeIngredientIds()))
            .addValue("codes", array("text", query.excludeCodes().stream().map(Enum::name).toList()))
            .addValue("skin", query.skinType() == null ? null : query.skinType().name());
    }

    public boolean hasConflictingIngredients(ProductQuery query) {
        return !query.includeIngredientIds().isEmpty() && Boolean.TRUE.equals(jdbc.queryForObject("""
            select exists (select 1 from unnest(cast(:included as bigint[])) i(id)
                where i.id = any(:excluded) or exists (select 1 from exclude_code_ingredient e
                    where e.ingredient_id = i.id and e.exclude_code = any(:codes)))
            """, parameters(query), Boolean.class));
    }

    private Facets facets(List<Aggregate> rows) {
        List<Long> brandIds = rows.stream().filter(r -> r.section().endsWith("_BRAND"))
            .map(r -> Long.valueOf(r.id())).distinct().toList();
        List<Brand> brands = jdbc.query(
            """
                select * from brand where id = any(:ids) order by korean_name collate "C", id
                """,
            new MapSqlParameterSource("ids", array("bigint", brandIds)),
            (rs, row) -> new Brand(
                rs.getLong("id"),
                rs.getString("korean_name"),
                rs.getString("english_name"),
                rs.getString("image_url")
            )
        );
        List<Category> categories = jdbc.query(
            "select * from category order by id",
            Map.of(),
            (rs, row) -> new Category(
                rs.getLong("id"),
                rs.getObject("parent_id", Long.class),
                rs.getString("name"),
                rs.getInt("depth")
            )
        );
        return new Facets(rows, brands, categories);
    }

    private static SqlArrayValue array(String type, List<?> values) {
        return new SqlArrayValue(type, values.toArray());
    }

    private static void validatePage(int page, int size) {
        if (page < 1 || size < 1) {
            throw new IllegalArgumentException("페이지 조건이 올바르지 않습니다.");
        }
    }

    private record Aggregate(String section, String id, long amount) {
    }

    private record SuggestionHit(long total, Long id, String field, String text, int start, int finish) {
    }

    private record Facets(List<Aggregate> rows, List<Brand> brands, List<Category> categories) {
        private Map<String, Long> counts(String section) {
            return rows.stream().filter(r -> r.section().equals(section))
                .collect(toMap(Aggregate::id, Aggregate::amount));
        }

        List<Brand> brands(String scope) {
            Map<String, Long> counts = counts(scope + "_BRAND");
            return brands.stream().filter(b -> counts.containsKey(b.id().toString())).toList();
        }

        List<CategoryProductCount> categories(String scope) {
            Map<String, Long> counts = counts(scope + "_CATEGORY");
            return categories.stream().filter(Category::isParent).filter(c -> counts.containsKey(c.id().toString()))
                .map(
                    c -> new CategoryProductCount(
                        c,
                        counts.get(c.id().toString()),
                        categories.stream()
                            .filter(child -> child.isChildOf(c) && counts.containsKey(child.id().toString()))
                            .map(child -> new CategoryProductCount(child, counts.get(child.id().toString()), List.of()))
                            .toList()
                    )
                )
                .toList();
        }

        List<SkinType> skinTypes(String scope) {
            return counts(scope + "_SKIN").keySet().stream().map(SkinType::valueOf).sorted().toList();
        }
    }
}
