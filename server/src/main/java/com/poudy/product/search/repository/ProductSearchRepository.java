package com.poudy.product.search.repository;

import static java.util.stream.Collectors.toMap;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.repository.BrandRepository;
import com.poudy.category.domain.Category;
import com.poudy.category.domain.CategoryProductCount;
import com.poudy.product.domain.Badge;
import com.poudy.product.domain.ProductCard;
import com.poudy.product.domain.ProductFilterOptions;
import com.poudy.product.domain.ProductMatchField;
import com.poudy.product.domain.ProductPage;
import com.poudy.product.domain.ProductQuery;
import com.poudy.product.domain.ProductSort;
import com.poudy.product.domain.ProductSuggestion;
import com.poudy.product.domain.ProductSuggestions;
import com.poudy.product.domain.ViewPeriod;
import com.poudy.product.domain.sensory.ProductSensory;
import com.poudy.product.repository.ProductLoader;
import com.poudy.product.search.domain.query.AnalyzedProductQuery;
import com.poudy.product.search.repository.query.ProductSearchQueryCodec;
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
public class ProductSearchRepository {

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
            left join category root on root.id = c.parent_id
            where (not :sensitiveSkin or p.is_sensitive_skin)
              and ((cardinality(cast(:moisture as double precision[])) = 0
                  and cardinality(cast(:oil as double precision[])) = 0)
                  or coalesce(root.name, c.name) <> all(cast(:sensoryExcludedCategories as text[])))
              and (cardinality(cast(:moisture as double precision[])) = 0 or exists (select 1 from unnest(cast(:moisture as double precision[])) level
                  where p.moisture_level >= level - 0.25 and p.moisture_level < level + 0.25))
              and (cardinality(cast(:oil as double precision[])) = 0 or exists (select 1 from unnest(cast(:oil as double precision[])) level
                  where p.oil_level >= level - 0.25 and p.oil_level < level + 0.25))
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

    private final ProductSearchQueryCodec codec = new ProductSearchQueryCodec();
    private final NamedParameterJdbcTemplate jdbc;
    private final ProductLoader loader;
    private final BrandRepository brandRepository;
    private final Clock clock;

    public ProductSearchRepository(
        NamedParameterJdbcTemplate jdbc,
        ProductLoader loader,
        BrandRepository brandRepository,
        Clock clock
    ) {
        this.jdbc = jdbc;
        this.loader = loader;
        this.brandRepository = brandRepository;
        this.clock = clock.withZone(SEOUL);
    }

    public ProductSearchResult<ProductPage> find(
        ProductQuery query,
        AnalyzedProductQuery analyzed,
        ProductSort sort,
        int page,
        int size
    ) {
        validatePage(page, size);
        MapSqlParameterSource parameters = parameters(query, analyzed)
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
            candidates(query) + PAGE.formatted(order, viewsJoin, order) + searchMetadata(query),
            parameters,
            (rs, row) -> new Aggregate(rs.getString("section"), rs.getString("id"), rs.getLong("amount"))
        );
        List<Long> ids = rows.stream().filter(r -> r.section().equals("PAGE"))
            .sorted(Comparator.comparingLong(Aggregate::amount)).map(r -> Long.valueOf(r.id())).toList();
        Facets facets = facets(rows);
        long total = rows.stream().filter(r -> r.section().equals("TOTAL")).findFirst().orElseThrow().amount();
        ProductPage result = new ProductPage(
            cards(ids),
            total,
            facets.brands("MATCH"),
            facets.categories("MATCH"),
            facets.skinTypes("MATCH"),
            filterOptions(page, facets)
        );
        return result(result, query, rows);
    }

    public ProductSearchResult<Long> count(ProductQuery query, AnalyzedProductQuery analyzed) {
        List<Aggregate> rows = jdbc.query(
            candidates(query) +
                " select 'TOTAL' as section, null::text as id, count(*) as amount from matched" + searchMetadata(query),
            parameters(query, analyzed),
            (rs, row) -> new Aggregate(rs.getString("section"), rs.getString("id"), rs.getLong("amount"))
        );
        return result(
            rows.stream().filter(r -> r.section().equals("TOTAL")).findFirst().orElseThrow().amount(),
            query,
            rows
        );
    }

    private ProductFilterOptions filterOptions(int page, Facets facets) {
        if (page != 1) {
            return null;
        }
        return new ProductFilterOptions(
            facets.brands("BRAND_OPTION"),
            facets.categories("CATEGORY_OPTION"),
            facets.skinTypes("SKIN_OPTION")
        );
    }

    private String searchMetadata(ProductQuery query) {
        if (!query.hasKeyword()) {
            return "";
        }
        return " union all select 'SEARCH_FULL',null::text,count(*) from search_hits where tier<=2"
            + " union all select 'SEARCH_TOTAL',null::text,count(*) from search_hits where tier<=2";
    }

    private <T> ProductSearchResult<T> result(T value, ProductQuery query, List<Aggregate> rows) {
        if (!query.hasKeyword()) {
            return new ProductSearchResult<>(value, true, 0);
        }
        long full = rows.stream().filter(r -> r.section().equals("SEARCH_FULL")).findFirst().orElseThrow().amount();
        long total = rows.stream().filter(r -> r.section().equals("SEARCH_TOTAL")).findFirst().orElseThrow().amount();
        return new ProductSearchResult<>(value, full > 0, total);
    }

    public ProductSearchResult<Boolean> hasResults(AnalyzedProductQuery analyzed) {
        return jdbc.queryForObject(
            "select count(*) filter (where tier<=2) as total from search_product_hits(cast(:analysis as jsonb))",
            Map.of("analysis", codec.encode(analyzed)),
            (
                rs,
                row) -> new ProductSearchResult<>(rs.getLong("total") > 0, rs.getLong("total") > 0, rs.getLong("total"))
        );
    }

    public String correctQuery(String query) {
        return jdbc
            .queryForObject("select search_correct_query(:query,'PRODUCT')", Map.of("query", query), String.class);
    }

    public ProductSearchResult<ProductSuggestions> suggest(AnalyzedProductQuery analyzed, int page, int size) {
        validatePage(page, size);
        MapSqlParameterSource parameters = new MapSqlParameterSource("analysis", codec.encode(analyzed))
            .addValue("offset", (long) (page - 1) * size).addValue("size", size);
        List<SuggestionHit> hits = jdbc.query(
            """
                with hits as materialized (select * from search_product_hits(cast(:analysis as jsonb))),
                page as (select * from hits order by tier,token_ratio desc,recent_views desc,name_length,product_id limit :size offset :offset)
                select totals.total,totals.full_match,p.product_id as id,p.match_field as field,p.match_text as text,
                       p.match_start as start,p.match_end as finish
                from (select count(*) as total,coalesce(bool_or(tier<=2),false) as full_match from hits) totals
                left join page p on true
                order by p.tier,p.token_ratio desc,p.recent_views desc,p.name_length,p.product_id
                """,
            parameters,
            (rs, row) -> new SuggestionHit(
                rs.getLong("total"),
                rs.getBoolean("full_match"),
                rs.getObject("id", Long.class),
                rs.getString("field"),
                rs.getString("text"),
                rs.getInt("start"),
                rs.getInt("finish")
            )
        );
        List<Long> ids = hits.stream().filter(h -> h.id() != null).map(SuggestionHit::id).toList();
        Map<Long, List<Badge>> badges = loader.loadBadges(ids);
        Map<Long, SuggestionDisplay> products = suggestionDisplays(ids);
        ProductSuggestions result = new ProductSuggestions(
            hits.stream().filter(h -> h.id() != null).map(
                h -> new ProductSuggestion(
                    h.id(),
                    products.get(h.id()).name(),
                    products.get(h.id()).brandName(),
                    badges.getOrDefault(h.id(), List.of()),
                    products.get(h.id()).imageUrl(),
                    ProductMatchField.valueOf(h.field()),
                    h.text(),
                    new MatchRange(h.start(), h.finish())
                )
            )
                .toList(),
            hits.getFirst().total()
        );
        return new ProductSearchResult<>(result, hits.getFirst().fullMatch(), hits.getFirst().total());
    }

    private Map<Long, SuggestionDisplay> suggestionDisplays(List<Long> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return jdbc.query(
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
    }

    private List<ProductCard> cards(List<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<Long, List<Badge>> badges = loader.loadBadges(ids);
        Map<Long, ProductCard> cards = jdbc.query(
            """
                select p.id, p.product_name, p.brand_id, p.image_url, p.moisture_level, p.oil_level,
                    p.is_sensitive_skin, p.updated_at,
                    b.korean_name, b.english_name, b.image_url as brand_image,
                    v.price, v.volume_value, v.volume_unit, coalesce(root.name, c.name) as root_category_name
                from product p join brand b on b.id = p.brand_id
                join category c on c.id = p.category_id
                left join category root on root.id = c.parent_id
                join lateral (select price, volume_value, volume_unit from product_variant
                    where product_id = p.id order by display_order limit 1) v on true
                where p.id = any(:ids)
                """,
            Map.of("ids", array("bigint", ids)),
            (rs, row) -> {
                ProductSensory sensory = ProductSensory.forCategory(
                    rs.getString("root_category_name"),
                    rs.getDouble("moisture_level"),
                    rs.getDouble("oil_level")
                );
                return new ProductCard(
                    rs.getLong("id"),
                    rs.getString("product_name"),
                    new Brand(
                        rs.getLong("brand_id"),
                        rs.getString("korean_name"),
                        rs.getString("english_name"),
                        rs.getString("brand_image")
                    ),
                    badges.getOrDefault(rs.getLong("id"), List.of()),
                    Objects.requireNonNullElse(rs.getString("image_url"), ""),
                    rs.getLong("price"),
                    rs.getBigDecimal("volume_value"),
                    rs.getString("volume_unit"),
                    sensory.moistureLevel(),
                    sensory.oilLevel(),
                    rs.getBoolean("is_sensitive_skin"),
                    rs.getObject("updated_at", LocalDateTime.class).atZone(SEOUL).toOffsetDateTime()
                );
            }
        ).stream().collect(toMap(ProductCard::id, card -> card));
        return ids.stream().map(cards::get).toList();
    }

    private String candidates(ProductQuery query) {
        String searchedJoin = "";
        String searchRank = "null::bigint";
        String cte = "";
        if (query.hasKeyword()) {
            searchedJoin = "join searched on searched.id=p.id";
            searchRank = "searched.search_rank";
            cte = "search_hits as materialized (select * from search_product_hits(cast(:analysis as jsonb))), "
                + "searched as (select product_id as id,row_number() over (order by tier,token_ratio desc,recent_views desc,name_length,product_id) as search_rank from search_hits where tier<=2), ";
        }
        String included = "";
        if (!query.includeIngredientIds().isEmpty()) {
            included = INCLUDED;
        }
        String excluded = "";
        if (!query.excludeIngredientIds().isEmpty() || !query.allExcludedCodes().isEmpty()) {
            excluded = EXCLUDED;
        }
        return CANDIDATES.formatted(cte, searchRank, searchedJoin, included, excluded);
    }

    private static String orderBy(ProductQuery query, ProductSort sort) {
        return switch (sort) {
            case DEFAULT -> defaultOrder(query);
            case CREATED_ASC -> "m.created_at asc";
            case PRICE_DESC -> "v.price desc";
            case PRICE_ASC -> "v.price asc";
            case UNIT_PRICE_DESC -> unitPriceOrder("desc");
            case UNIT_PRICE_ASC -> unitPriceOrder("asc");
        };
    }

    private static String defaultOrder(ProductQuery query) {
        if (query.hasKeyword()) {
            return "m.search_rank asc";
        }
        return "coalesce(views.view_count, 0) desc";
    }

    private static String unitPriceOrder(String direction) {
        return "case when v.volume_unit = 'ea' or v.volume_value = 0 then 1 else 0 end asc, "
            + "case when v.volume_unit <> 'ea' and v.volume_value > 0 "
            + "then v.price::numeric / nullif(v.volume_value, 0) end " + direction + " nulls last";
    }

    private MapSqlParameterSource parameters(ProductQuery query, AnalyzedProductQuery analyzed) {
        String encoded = null;
        if (analyzed != null) {
            encoded = codec.encode(analyzed);
        }
        String skin = null;
        if (query.skinType() != null) {
            skin = query.skinType().name();
        }
        return new MapSqlParameterSource("analysis", encoded)
            .addValue("brands", array("bigint", query.brandIds()))
            .addValue("categories", array("bigint", query.categoryIds()))
            .addValue("sensoryExcludedCategories", array("text", ProductSensory.excludedCategoryNames()))
            .addValue("moisture", array("float8", query.moistureLevels()))
            .addValue("oil", array("float8", query.oilLevels()))
            .addValue("included", array("bigint", query.includeIngredientIds()))
            .addValue("excluded", array("bigint", query.excludeIngredientIds()))
            .addValue("codes", array("text", query.allExcludedCodes()))
            .addValue("includedGroups", array("text", query.includeGroupCodes()))
            .addValue("skin", skin)
            .addValue("sensitiveSkin", query.sensitiveSkin());
    }

    public boolean hasConflictingIngredients(ProductQuery query) {
        return query.hasIncludeConditions() && Boolean.TRUE.equals(jdbc.queryForObject("""
            select exists (select 1 from unnest(cast(:included as bigint[])) i(id)
                where i.id = any(:excluded) or exists (select 1 from ingredient_group_ingredient e
                    where e.ingredient_id = i.id and e.group_code = any(:codes)))
                or exists (select 1 from unnest(cast(:includedGroups as text[])) g(code) where g.code = any(:codes))
            """, parameters(query, null), Boolean.class));
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

    private record SuggestionHit(
        long total,
        boolean fullMatch,
        Long id,
        String field,
        String text,
        int start,
        int finish) {
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
