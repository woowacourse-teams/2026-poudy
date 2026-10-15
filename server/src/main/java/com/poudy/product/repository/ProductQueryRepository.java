package com.poudy.product.repository;

import static java.util.stream.Collectors.toMap;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.repository.BrandRepository;
import com.poudy.category.domain.Category;
import com.poudy.category.domain.CategoryProductCount;
import com.poudy.product.domain.ProductCard;
import com.poudy.product.domain.ProductFilterOptions;
import com.poudy.product.domain.ProductMatchField;
import com.poudy.product.domain.ProductPage;
import com.poudy.product.domain.ProductQuery;
import com.poudy.product.domain.ProductSort;
import com.poudy.product.domain.ProductSuggestion;
import com.poudy.product.domain.ProductSuggestions;
import com.poudy.product.domain.ViewPeriod;
import com.poudy.search.domain.MatchRange;
import com.poudy.skintype.domain.SkinType;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.SqlArrayValue;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ProductQueryRepository {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final int DEFAULT_SORT_VIEW_DAYS = 30;

    // 검색 결과를 한 번 계산하고 목록, 개수, 각 선택지의 집계가 같은 후보를 공유한다.
    private static final String CANDIDATES = """
        with %scandidates as materialized (
            select p.*, c.parent_id, %s as search_rank,
                (cardinality(cast(:brands as bigint[])) = 0 or p.brand_id = any(:brands)) as brand_ok,
                (cardinality(cast(:categories as bigint[])) = 0
                    or p.category_id = any(:categories) or c.parent_id = any(:categories)) as category_ok,
                (cast(:skin as text) is null or exists (select 1 from product_skin_type s
                    where s.product_id = p.id and s.skin_type_code = :skin)) as skin_ok
            from product p %s join category c on c.id = p.category_id
            where (cardinality(cast(:moisture as integer[])) = 0 or p.moisture_level = any(:moisture))
              and (cardinality(cast(:oil as integer[])) = 0 or p.oil_level = any(:oil))
              %s
              and not exists (select 1 from unnest(cast(:includedGroups as text[])) wanted(code)
                  where not exists (select 1 from product_component pc
                      join product_ingredient pi on pi.component_id = pc.id
                      join ingredient_group_ingredient g on g.ingredient_id = pi.ingredient_id
                      where pc.product_id = p.id and g.group_code = wanted.code))
              %s
        ), matched as (select * from candidates where brand_ok and category_ok and skin_ok)
        """;

    private static final String INCLUDED = """
        and p.id in (
            select pc.product_id from product_component pc
            join product_ingredient pi on pi.component_id = pc.id
            where pi.ingredient_id = any(cast(:included as bigint[]))
            group by pc.product_id
            having count(distinct pi.ingredient_id) =
                (select count(distinct wanted.id) from unnest(cast(:included as bigint[])) wanted(id))
        )
        """;

    private static final String EXCLUDED = """
        and not exists (select 1 from product_component pc
                  join product_ingredient pi on pi.component_id = pc.id where pc.product_id = p.id
                  and (pi.ingredient_id = any(:excluded) or exists (
                      select 1 from ingredient_group_ingredient e where e.ingredient_id = pi.ingredient_id
                          and e.group_code = any(:codes))))
        """;

    private static final String PAGE = """
        , page as (
            select m.id, row_number() over (order by %s, m.id) as position
            from matched m join lateral (select price, volume_value, volume_unit from product_variant v
                where v.product_id = m.id order by v.display_order limit 1) v on true
            %s
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
    private final BrandRepository brandRepository;
    private final Clock clock;

    public ProductQueryRepository(
        NamedParameterJdbcTemplate jdbc,
        BrandRepository brandRepository,
        Clock clock
    ) {
        this.jdbc = jdbc;
        this.brandRepository = brandRepository;
        this.clock = clock.withZone(SEOUL);
    }

    public ProductPage find(ProductQuery query, ProductSort sort, int page, int size) {
        validatePage(page, size);
        MapSqlParameterSource parameters = parameters(query)
            .addValue("size", size).addValue("offset", (long) (page - 1) * size).addValue("options", page == 1);
        ProductSort selectedSort = ProductSort.orDefault(sort);
        String order = orderBy(query, selectedSort);
        String viewsJoin = "";
        if (selectedSort == ProductSort.DEFAULT && !query.hasKeyword()) {
            ViewPeriod period = ViewPeriod.recentDays(LocalDate.now(clock).minusDays(1), DEFAULT_SORT_VIEW_DAYS);
            parameters.addValue("viewStart", period.firstDate()).addValue("viewEnd", period.lastDate());
            viewsJoin = """
                left join (select product_id, sum(view_count) as view_count from product_daily_view
                    where view_date between :viewStart and :viewEnd group by product_id) views
                    on views.product_id = m.id
                """;
        }
        List<Aggregate> rows = jdbc.query(
            candidates(query) + PAGE.formatted(order, viewsJoin, order),
            parameters,
            (rs, row) -> new Aggregate(rs.getString("section"), rs.getString("id"), rs.getLong("amount"))
        );
        List<Long> ids = rows.stream().filter(r -> r.section().equals("PAGE"))
            .sorted(Comparator.comparingLong(Aggregate::amount)).map(r -> Long.valueOf(r.id())).toList();
        Facets facets = facets(rows);
        long total = rows.stream().filter(r -> r.section().equals("TOTAL")).findFirst().orElseThrow().amount();
        return new ProductPage(
            cards(ids),
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
        List<Long> ids = hits.stream().filter(h -> h.id() != null).map(SuggestionHit::id).toList();
        Map<Long, SuggestionDisplay> products = ids.isEmpty() ? Map.of() : jdbc.query(
            """
                select p.id, p.product_name, coalesce(p.image_url, '') as image_url, b.korean_name
                from product p join brand b on b.id = p.brand_id where p.id = any(:ids)
                """,
            Map.of("ids", array("bigint", ids)),
            (rs, row) -> new SuggestionDisplay(
                rs.getLong("id"),
                rs.getString("product_name"),
                rs.getString("image_url"),
                rs.getString("korean_name")
            )
        ).stream().collect(toMap(SuggestionDisplay::id, display -> display));
        return new ProductSuggestions(
            hits.stream().filter(h -> h.id() != null).map(
                h -> new ProductSuggestion(
                    h.id(),
                    products.get(h.id()).name(),
                    products.get(h.id()).imageUrl(),
                    products.get(h.id()).brandName(),
                    ProductMatchField.valueOf(h.field()),
                    h.text(),
                    new MatchRange(h.start(), h.finish())
                )
            )
                .toList(),
            hits.getFirst().total()
        );
    }

    private List<ProductCard> cards(List<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<Long, ProductCard> cards = jdbc.query(
            """
                select p.id, p.product_name, p.brand_id, p.image_url, p.moisture_level, p.oil_level, p.updated_at,
                    b.korean_name, b.english_name, b.image_url as brand_image,
                    v.price, v.volume_value, v.volume_unit
                from product p join brand b on b.id = p.brand_id
                join lateral (select price, volume_value, volume_unit from product_variant
                    where product_id = p.id order by display_order limit 1) v on true
                where p.id = any(:ids)
                """,
            Map.of("ids", array("bigint", ids)),
            (rs, row) -> new ProductCard(
                rs.getLong("id"),
                rs.getString("product_name"),
                new Brand(
                    rs.getLong("brand_id"),
                    rs.getString("korean_name"),
                    rs.getString("english_name"),
                    rs.getString("brand_image")
                ),
                Objects.requireNonNullElse(rs.getString("image_url"), ""),
                rs.getLong("price"),
                rs.getBigDecimal("volume_value"),
                rs.getString("volume_unit"),
                rs.getInt("moisture_level"),
                rs.getInt("oil_level"),
                rs.getObject("updated_at", LocalDateTime.class).atZone(SEOUL).toOffsetDateTime()
            )
        ).stream().collect(toMap(ProductCard::id, card -> card));
        return ids.stream().map(cards::get).toList();
    }

    private String candidates(ProductQuery query) {
        String searchedCte = query.hasKeyword() ? """
            select (item ->> 'productId')::bigint as id, (item ->> 'rank')::bigint as search_rank
            from search_products(:keyword, 0, null, 2) result, jsonb_array_elements(result.items) item
            """ : "";
        String searchRank = query.hasKeyword() ? "searched.search_rank" : "null::bigint";
        String searchedJoin = query.hasKeyword() ? "join searched on searched.id = p.id" : "";
        String cte = query.hasKeyword() ? "searched as materialized (" + searchedCte + "), " : "";
        String included = query.includeIngredientIds().isEmpty() ? "" : INCLUDED;
        String excluded = query.excludeIngredientIds().isEmpty() && query.allExcludedCodes().isEmpty()
            ? "" : EXCLUDED;
        return CANDIDATES.formatted(cte, searchRank, searchedJoin, included, excluded);
    }

    private static String orderBy(ProductQuery query, ProductSort sort) {
        return switch (sort) {
            case DEFAULT -> query.hasKeyword() ? "m.search_rank asc" : "coalesce(views.view_count, 0) desc";
            case CREATED_ASC -> "m.created_at asc";
            case PRICE_DESC -> "v.price desc";
            case PRICE_ASC -> "v.price asc";
            case UNIT_PRICE_DESC -> unitPriceOrder("desc");
            case UNIT_PRICE_ASC -> unitPriceOrder("asc");
        };
    }

    private static String unitPriceOrder(String direction) {
        return "case when v.volume_unit = 'ea' or v.volume_value = 0 then 1 else 0 end asc, "
            + "case when v.volume_unit <> 'ea' and v.volume_value > 0 "
            + "then v.price::numeric / nullif(v.volume_value, 0) end " + direction + " nulls last";
    }

    private MapSqlParameterSource parameters(ProductQuery query) {
        return new MapSqlParameterSource("keyword", query.keyword())
            .addValue("brands", array("bigint", query.brandIds()))
            .addValue("categories", array("bigint", query.categoryIds()))
            .addValue("moisture", array("integer", query.moistureLevels()))
            .addValue("oil", array("integer", query.oilLevels()))
            .addValue("included", array("bigint", query.includeIngredientIds()))
            .addValue("excluded", array("bigint", query.excludeIngredientIds()))
            .addValue("codes", array("text", query.allExcludedCodes()))
            .addValue("includedGroups", array("text", query.includeGroupCodes()))
            .addValue("skin", query.skinType() == null ? null : query.skinType().name());
    }

    public boolean hasConflictingIngredients(ProductQuery query) {
        return query.hasIncludeConditions() && Boolean.TRUE.equals(jdbc.queryForObject("""
            select exists (select 1 from unnest(cast(:included as bigint[])) i(id)
                where i.id = any(:excluded) or exists (select 1 from ingredient_group_ingredient e
                    where e.ingredient_id = i.id and e.group_code = any(:codes)))
                or exists (select 1 from unnest(cast(:includedGroups as text[])) g(code) where g.code = any(:codes))
            """, parameters(query), Boolean.class));
    }

    private Facets facets(List<Aggregate> rows) {
        List<Long> brandIds = rows.stream().filter(r -> r.section().endsWith("_BRAND"))
            .map(r -> Long.valueOf(r.id())).distinct().toList();
        List<Brand> brands = brandRepository.findAllByIdOrderByName(brandIds);
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

    private record SuggestionDisplay(long id, String name, String imageUrl, String brandName) {
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
