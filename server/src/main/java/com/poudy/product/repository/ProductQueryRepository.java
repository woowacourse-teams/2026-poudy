package com.poudy.product.repository;

import static java.util.stream.Collectors.toMap;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandProductCount;
import com.poudy.brand.repository.BrandRepository;
import com.poudy.category.domain.Category;
import com.poudy.category.domain.CategoryProductCount;
import com.poudy.product.domain.Mark;
import com.poudy.product.domain.MarkFilterGroup;
import com.poudy.product.domain.ProductCard;
import com.poudy.product.domain.ProductFilterOptions;
import com.poudy.product.domain.ProductMatchField;
import com.poudy.product.domain.ProductPage;
import com.poudy.product.domain.ProductQuery;
import com.poudy.product.domain.ProductSort;
import com.poudy.product.domain.ProductSuggestion;
import com.poudy.product.domain.ProductSuggestions;
import com.poudy.product.domain.RelatedKeyword;
import com.poudy.product.domain.RelatedKeywords;
import com.poudy.product.domain.ViewPeriod;
import com.poudy.product.domain.sensory.ProductSensory;
import com.poudy.search.domain.MatchRange;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.skintype.domain.SkinChoice;
import com.poudy.skintype.domain.SkinOptionProductCount;
import com.poudy.skintype.domain.SkinType;
import java.sql.Array;
import java.sql.SQLException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;
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
    private static final String UNMATCHED_MARKS = """
        array(select g.group_code from requested_mark_groups g where (
            select count(*) from product_mark pm
            join requested_mark_values wanted on wanted.code = pm.mark_code
            where pm.product_id = p.id and wanted.group_code = g.group_code
        ) < g.required_matches)
        """;

    private static final String SENSORY_JOINS = """
        left join category root on root.id = c.parent_id
        left join lateral (select moisture_level, oil_level from product_component
            where product_id = p.id order by display_order limit 1) sensory on true
        """;

    private static final String INCLUDED_GROUPS = """
        and not exists (select 1 from unnest(cast(:includedGroups as text[])) wanted(code)
            where not exists (select 1 from product_component pc
                join product_ingredient pi on pi.component_id = pc.id
                join ingredient_group_ingredient g on g.ingredient_id = pi.ingredient_id
                where pc.product_id = p.id and g.group_code = wanted.code))
        """;

    private static final String CANDIDATES = """
        with %smark_definitions as materialized (
            select * from unnest(cast(:filterMarkCodes as text[]), cast(:filterMarkGroups as text[])) m(code, group_code)
        ), requested_mark_values as materialized (
            select * from mark_definitions where code = any(cast(:markSelections as text[]))
        ), requested_mark_groups as (
            select group_code,
                case when group_code = any(cast(:allRequiredMarkGroups as text[]))
                    then count(*) else 1 end as required_matches
            from requested_mark_values group by group_code
        ), candidates as materialized (
            select p.id, p.brand_id, p.category_id, p.created_at, p.is_sensitive_skin, c.parent_id, %s as search_rank,
                %s as unmatched_marks,
                %s as brand_ok,
                %s as category_ok,
                %s as skin_ok
            from product p %s join category c on c.id = p.category_id
            %s
            where true
            %s
        ), matched as (select %s from candidates where %s)
        """;

    private static final String SINGLE_INCLUDED = """
        and p.id in (
            select pc.product_id from product_component pc
            join product_ingredient pi on pi.component_id = pc.id
            where pi.ingredient_id = any(cast(:included as bigint[]))
        )
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

    private static final String VIEW_COUNTS = """
        , monthly_views as materialized (
            select product_id, sum(view_count) as view_count from product_daily_view
            where view_date between :viewStart and :viewEnd group by product_id
        )
        """;

    private static final String DEFAULT_PAGE = """
        , page as (
            select picked.id,
                row_number() over (order by picked.view_count desc, picked.id) + :offset as position
            from (
                select m.id, coalesce(views.view_count, 0) as view_count
                from matched m left join monthly_views views on views.product_id = m.id
                where exists (select 1 from product_variant v where v.product_id = m.id)
                order by coalesce(views.view_count, 0) desc, m.id limit :size offset :offset
            ) picked
        )
        """;

    private static final String SORTED_PAGE = """
        , page as (
            select m.id, row_number() over (order by %s, m.id) as position
            from matched m join lateral (select price, volume_value, volume_unit from product_variant v
                where v.product_id = m.id order by v.display_order limit 1) v on true
            order by %s, m.id limit :size offset :offset
        )
        """;

    private static final String PAGE = """
        select 'TOTAL' as section, null::text as id, count(*) as amount from matched
        union all select 'PAGE', id::text, position from page
        union all select 'BRAND_OPTION_BRAND', brand_id::text, count(*) from candidates
            where :options and category_ok and skin_ok and cardinality(unmatched_marks) = 0
            group by brand_id
        union all select 'CATEGORY_OPTION_CATEGORY', category.id::text, count(*) from candidates
            cross join lateral (values (category_id), (parent_id)) category(id)
            where :options and brand_ok and skin_ok and cardinality(unmatched_marks) = 0
            group by category.id
        union all select 'SKIN_OPTION_SKIN', s.skin_type_code, count(*) from candidates p
            join product_skin_type s on s.product_id = p.id
            where :options and brand_ok and category_ok and cardinality(unmatched_marks) = 0
            group by s.skin_type_code
        union all select 'SKIN_OPTION_SENSITIVE', null::text, count(*) from candidates
            where :options and brand_ok and category_ok and cardinality(unmatched_marks) = 0 and is_sensitive_skin
        union all select 'MARK_OPTION', pm.mark_code, count(*)
            from candidates p join product_mark pm on pm.product_id = p.id
            join mark_definitions d on d.code = pm.mark_code
            where :options and p.brand_ok and p.category_ok and p.skin_ok
                and %s
            group by pm.mark_code
        """;

    private final NamedParameterJdbcTemplate jdbc;
    private final ProductLoader loader;
    private final BrandRepository brandRepository;
    private final Clock clock;

    public ProductQueryRepository(
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

    public ProductPage find(ProductQuery query, ProductSort sort, int page, int size) {
        return find(query, sort, page, size, page == 1);
    }

    public ProductPage findCards(ProductQuery query, ProductSort sort, int page, int size) {
        return find(query, sort, page, size, false);
    }

    private ProductPage find(ProductQuery query, ProductSort sort, int page, int size, boolean options) {
        validatePage(page, size);
        MapSqlParameterSource parameters = parameters(query)
            .addValue("size", size).addValue("offset", (long) (page - 1) * size).addValue("options", options);
        ProductSort selectedSort = ProductSort.orDefault(sort);
        String order = orderBy(query, selectedSort);
        boolean monthlyOrder = selectedSort == ProductSort.DEFAULT && !query.hasKeyword();
        String viewsCte = "";
        if (monthlyOrder) {
            ViewPeriod period = ViewPeriod.recentDays(LocalDate.now(clock).minusDays(1), DEFAULT_SORT_VIEW_DAYS);
            parameters.addValue("viewStart", period.firstDate()).addValue("viewEnd", period.lastDate());
            viewsCte = VIEW_COUNTS;
        }
        String pageSql = monthlyOrder ? DEFAULT_PAGE : SORTED_PAGE.formatted(order, order);
        String matchedColumns = switch (selectedSort) {
            case CREATED_ASC -> "id, created_at";
            case DEFAULT -> query.hasKeyword() ? "id, search_rank" : "id";
            default -> "id";
        };
        List<Aggregate> rows = jdbc.query(
            candidates(query, matchedColumns) + viewsCte + pageSql + PAGE.formatted(markOptionCondition(query)),
            parameters,
            (rs, row) -> new Aggregate(rs.getString("section"), rs.getString("id"), rs.getLong("amount"))
        );
        List<Long> ids = rows.stream().filter(r -> r.section().equals("PAGE"))
            .sorted(Comparator.comparingLong(Aggregate::amount)).map(r -> Long.valueOf(r.id())).toList();
        long total = rows.stream().filter(r -> r.section().equals("TOTAL")).findFirst().orElseThrow().amount();
        ProductFilterOptions filterOptions = null;
        if (options) {
            Facets facets = facets(rows, query.brandIds());
            filterOptions = new ProductFilterOptions(
                facets.brands("BRAND_OPTION", query.brandIds()),
                facets.categories("CATEGORY_OPTION", query.categoryIds()),
                facets.skinOptions("SKIN_OPTION", query.skinTypes(), query.sensitiveSkin()),
                MarkFilterGroup.options(facets.counts("MARK_OPTION"), query.marks())
            );
        }
        return new ProductPage(
            cards(ids),
            total,
            filterOptions
        );
    }

    public long count(ProductQuery query) {
        return jdbc.queryForObject(candidates(query) + " select count(*) from matched", parameters(query), Long.class);
    }

    public ProductSuggestions suggest(String keyword, int page, int size) {
        validatePage(page, size);
        MapSqlParameterSource parameters = new MapSqlParameterSource("keyword", keyword)
            .addValue("markDefinitions", MarkSqlParameters.definitions())
            .addValue("offset", (long) (page - 1) * size).addValue("size", size);
        List<SuggestionHit> hits = jdbc.query(
            """
                select total, product_id as id, match_field as field, match_text as text,
                    match_range[1] as start, match_range[2] as finish
                from search_product_suggestions(:keyword, :offset, :size, 2, cast(:markDefinitions as jsonb))
                order by result_position
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
        List<Long> ids = hits.stream().map(SuggestionHit::id).filter(Objects::nonNull).toList();
        Map<Long, List<Mark>> marks = loader.loadMarks(ids);
        Map<Long, SuggestionDisplay> products = suggestionDisplays(ids);
        return new ProductSuggestions(
            hits.stream().filter(h -> h.id() != null).map(
                h -> new ProductSuggestion(
                    h.id(),
                    products.get(h.id()).name(),
                    products.get(h.id()).brandName(),
                    marks.getOrDefault(h.id(), List.of()),
                    products.get(h.id()).imageUrl(),
                    products.get(h.id()).supportsSensory(),
                    ProductMatchField.valueOf(h.field()),
                    h.text(),
                    new MatchRange(h.start(), h.finish())
                )
            )
                .toList(),
            hits.getFirst().total()
        );
    }

    public RelatedKeywords relatedKeywords(String keyword, int limit) {
        return new RelatedKeywords(
            jdbc.query(
                """
                    select keyword, match_ranges
                    from search_product_related_keywords(:keyword, :limit, :maxLength, cast(:markDefinitions as jsonb))
                    """,
                Map.of(
                    "keyword",
                    keyword,
                    "limit",
                    limit,
                    "maxLength",
                    SearchKeyword.MAX_LENGTH,
                    "markDefinitions",
                    MarkSqlParameters.definitions()
                ),
                (rs, row) -> RelatedKeyword.of(rs.getString("keyword"), matchRanges(rs.getArray("match_ranges")))
            )
        );
    }

    private Map<Long, SuggestionDisplay> suggestionDisplays(List<Long> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        List<SuggestionDisplay> products = jdbc.query(
            """
                select p.id, p.product_name, coalesce(p.image_url, '') as image_url, b.korean_name,
                    sensory.moisture_level, sensory.oil_level, coalesce(root.name, c.name) as root_category_name
                from product p join brand b on b.id = p.brand_id
                join category c on c.id = p.category_id
                left join category root on root.id = c.parent_id
                left join lateral (select moisture_level, oil_level from product_component
                    where product_id = p.id order by display_order limit 1) sensory on true
                where p.id = any(:ids)
                """,
            Map.of("ids", array("bigint", ids)),
            (rs, row) -> new SuggestionDisplay(
                rs.getLong("id"),
                rs.getString("product_name"),
                rs.getString("image_url"),
                rs.getString("korean_name"),
                ProductSensory.forCategory(
                    rs.getString("root_category_name"),
                    rs.getObject("moisture_level", Double.class),
                    rs.getObject("oil_level", Double.class)
                ).isAvailable()
            )
        );
        return products.stream().collect(toMap(SuggestionDisplay::id, display -> display));
    }

    private List<ProductCard> cards(List<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<Long, List<Mark>> marks = loader.loadMarks(ids);
        Map<Long, ProductCard> cards = jdbc.query(
            """
                select p.id, p.product_name, p.brand_id, p.image_url, sensory.moisture_level, sensory.oil_level,
                    p.is_sensitive_skin, p.updated_at,
                    b.korean_name, b.english_name, b.image_url as brand_image,
                    v.price, v.volume_value, v.volume_unit, coalesce(root.name, c.name) as root_category_name
                from product p join brand b on b.id = p.brand_id
                join category c on c.id = p.category_id
                left join category root on root.id = c.parent_id
                join lateral (select price, volume_value, volume_unit from product_variant
                    where product_id = p.id order by display_order limit 1) v on true
                left join lateral (select moisture_level, oil_level from product_component
                    where product_id = p.id order by display_order limit 1) sensory on true
                where p.id = any(:ids)
                """,
            Map.of("ids", array("bigint", ids)),
            (rs, row) -> {
                ProductSensory sensory = ProductSensory.forCategory(
                    rs.getString("root_category_name"),
                    rs.getObject("moisture_level", Double.class),
                    rs.getObject("oil_level", Double.class)
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
                    marks.getOrDefault(rs.getLong("id"), List.of()),
                    Objects.requireNonNullElse(rs.getString("image_url"), ""),
                    rs.getObject("price", Long.class),
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
        return candidates(query, "id");
    }

    private String candidates(ProductQuery query, String matchedColumns) {
        String cte = "";
        String searchRank = "null::bigint";
        String searchedJoin = "";
        if (query.hasKeyword()) {
            String searchedCte = """
                select * from search_product_results(:keyword, 2, cast(:markDefinitions as jsonb))
                """;
            cte = "searched as materialized (" + searchedCte + "), ";
            searchRank = "searched.rank";
            searchedJoin = "join searched on searched.product_id = p.id";
        }
        String included = "";
        if (query.hasIncludedIngredients()) {
            included = query.includeIngredientIds().stream().distinct().count() == 1 ? SINGLE_INCLUDED : INCLUDED;
        }
        String excluded = "";
        if (query.hasExcludeConditions()) {
            excluded = EXCLUDED;
        }
        boolean sensoryFilter = !query.moistureLevels().isEmpty() || !query.oilLevels().isEmpty();
        String conditions = sensoryConditions(query) + included
            + (query.includeGroupCodes().isEmpty() ? "" : INCLUDED_GROUPS) + excluded;
        return CANDIDATES.formatted(
            cte,
            searchRank,
            query.marks().isEmpty() ? "array[]::text[]" : UNMATCHED_MARKS,
            query.brandIds().isEmpty() ? "true" : "p.brand_id = any(:brands)",
            query.categoryIds().isEmpty() ? "true"
                : "(p.category_id = any(:categories) or c.parent_id = any(:categories))",
            skinCondition(query),
            searchedJoin,
            sensoryFilter ? SENSORY_JOINS : "",
            conditions,
            matchedColumns,
            matchedCondition(query)
        );
    }

    private static String skinCondition(ProductQuery query) {
        if (query.skinTypes().isEmpty()) {
            return query.sensitiveSkin() ? "p.is_sensitive_skin" : "true";
        }
        String skinMatch = """
            exists (select 1 from product_skin_type s
                where s.product_id = p.id and s.skin_type_code = any(:skins))
            """;
        return query.sensitiveSkin() ? "(p.is_sensitive_skin or " + skinMatch + ")" : skinMatch;
    }

    private static String sensoryConditions(ProductQuery query) {
        if (query.moistureLevels().isEmpty() && query.oilLevels().isEmpty()) {
            return "";
        }
        String conditions = "and coalesce(root.name, c.name) <> all(cast(:sensoryExcludedCategories as text[]))\n";
        if (!query.moistureLevels().isEmpty()) {
            conditions += """
                and exists (select 1 from unnest(cast(:moisture as double precision[])) level
                    where sensory.moisture_level >= level - 0.25 and sensory.moisture_level < level + 0.25)
                """;
        }
        if (!query.oilLevels().isEmpty()) {
            conditions += """
                and exists (select 1 from unnest(cast(:oil as double precision[])) level
                    where sensory.oil_level >= level - 0.25 and sensory.oil_level < level + 0.25)
                """;
        }
        return conditions;
    }

    private static String matchedCondition(ProductQuery query) {
        List<String> conditions = new ArrayList<>();
        if (!query.brandIds().isEmpty()) {
            conditions.add("brand_ok");
        }
        if (!query.categoryIds().isEmpty()) {
            conditions.add("category_ok");
        }
        if (!query.skinTypes().isEmpty() || query.sensitiveSkin()) {
            conditions.add("skin_ok");
        }
        if (!query.marks().isEmpty()) {
            conditions.add("cardinality(unmatched_marks) = 0");
        }
        return conditions.isEmpty() ? "true" : String.join(" and ", conditions);
    }

    private static String markOptionCondition(ProductQuery query) {
        return query.marks().isEmpty() ? "true" : "p.unmatched_marks <@ array[d.group_code]";
    }

    private static String orderBy(ProductQuery query, ProductSort sort) {
        return switch (sort) {
            case DEFAULT -> defaultOrderBy(query);
            case CREATED_ASC -> "m.created_at asc";
            case PRICE_DESC -> "v.price desc nulls last";
            case PRICE_ASC -> "v.price asc nulls last";
            case UNIT_PRICE_DESC -> unitPriceOrder("desc");
            case UNIT_PRICE_ASC -> unitPriceOrder("asc");
        };
    }

    private static String defaultOrderBy(ProductQuery query) {
        if (query.hasKeyword()) {
            return "m.search_rank asc";
        }
        return "coalesce(views.view_count, 0) desc";
    }

    private static String unitPriceOrder(String direction) {
        return "case when v.price is null or v.volume_unit = 'ea' or v.volume_value = 0 then 1 else 0 end asc, "
            + "case when v.volume_unit <> 'ea' and v.volume_value > 0 "
            + "then v.price::numeric / nullif(v.volume_value, 0) end " + direction + " nulls last";
    }

    private MapSqlParameterSource parameters(ProductQuery query) {
        return MarkSqlParameters.filters()
            .addValue("keyword", query.keyword())
            .addValue("markDefinitions", MarkSqlParameters.definitions())
            .addValue("categories", array("bigint", query.categoryIds()))
            .addValue("brands", array("bigint", query.brandIds()))
            .addValue("sensoryExcludedCategories", array("text", ProductSensory.excludedCategoryNames()))
            .addValue("moisture", array("float8", query.moistureLevels()))
            .addValue("oil", array("float8", query.oilLevels()))
            .addValue("included", array("bigint", query.includeIngredientIds()))
            .addValue("excluded", array("bigint", query.excludeIngredientIds()))
            .addValue("codes", array("text", query.allExcludedCodes()))
            .addValue("includedGroups", array("text", query.includeGroupCodes()))
            .addValue("skins", array("text", query.skinTypes().stream().map(SkinType::name).toList()))
            .addValue("sensitiveSkin", query.sensitiveSkin())
            .addValue(
                "markSelections",
                array(
                    "text",
                    query.marks().stream().map(Mark::code).toList()
                )
            );
    }

    public boolean hasConflictingIngredients(ProductQuery query) {
        return query.hasIncludeConditions() && Boolean.TRUE.equals(jdbc.queryForObject("""
            select exists (select 1 from unnest(cast(:included as bigint[])) i(id)
                where i.id = any(:excluded) or exists (select 1 from ingredient_group_ingredient e
                    where e.ingredient_id = i.id and e.group_code = any(:codes)))
                or exists (select 1 from unnest(cast(:includedGroups as text[])) g(code) where g.code = any(:codes))
            """, parameters(query), Boolean.class));
    }

    private Facets facets(List<Aggregate> rows, List<Long> selectedBrandIds) {
        List<Long> brandIds = Stream.concat(
            rows.stream().filter(r -> r.section().endsWith("_BRAND")).map(r -> Long.valueOf(r.id())),
            selectedBrandIds.stream()
        ).distinct().toList();
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
        return Facets.from(rows, brands, categories);
    }

    private static List<MatchRange> matchRanges(Array ranges) throws SQLException {
        return Arrays.stream((Integer[][]) ranges.getArray()).map(range -> new MatchRange(range[0], range[1])).toList();
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

    private record SuggestionDisplay(long id, String name, String imageUrl, String brandName, boolean supportsSensory) {
    }

    private record SuggestionHit(long total, Long id, String field, String text, int start, int finish) {
    }

    private static final class Facets {
        private final List<Aggregate> rows;
        private final Map<Long, Brand> brands;
        private final Map<Long, Category> categories;

        private Facets(List<Aggregate> rows, Map<Long, Brand> brands, Map<Long, Category> categories) {
            this.rows = rows;
            this.brands = brands;
            this.categories = categories;
        }

        private static Facets from(List<Aggregate> rows, List<Brand> brands, List<Category> categories) {
            Map<Long, Brand> indexedBrands = new LinkedHashMap<>();
            brands.forEach(brand -> indexedBrands.put(brand.id(), brand));
            Map<Long, Category> indexedCategories = new LinkedHashMap<>();
            categories.forEach(category -> indexedCategories.put(category.id(), category));
            return new Facets(
                rows,
                Collections.unmodifiableMap(indexedBrands),
                Collections.unmodifiableMap(indexedCategories)
            );
        }

        private Map<String, Long> counts(String section) {
            return rows.stream().filter(r -> r.section().equals(section))
                .collect(toMap(Aggregate::id, Aggregate::amount));
        }

        List<BrandProductCount> brands(String scope, List<Long> selected) {
            Map<String, Long> counts = counts(scope + "_BRAND");
            return brands.values().stream()
                .filter(b -> counts.containsKey(b.id().toString()) || selected.contains(b.id()))
                .map(b -> new BrandProductCount(b, counts.getOrDefault(b.id().toString(), 0L)))
                .toList();
        }

        List<CategoryProductCount> categories(String scope, List<Long> selected) {
            Map<String, Long> counts = counts(scope + "_CATEGORY");
            List<CategoryProductCount> categoryOptions = new ArrayList<>();
            for (Category parent : categories.values()) {
                if (!parent.isParent()) {
                    continue;
                }
                List<CategoryProductCount> children = categoryChildren(parent, counts, selected);
                long productCount = counts.getOrDefault(parent.id().toString(), 0L);
                if (productCount > 0 || selected.contains(parent.id()) || !children.isEmpty()) {
                    categoryOptions.add(new CategoryProductCount(parent, productCount, children));
                }
            }
            return List.copyOf(categoryOptions);
        }

        private List<CategoryProductCount> categoryChildren(
            Category parent,
            Map<String, Long> counts,
            List<Long> selected
        ) {
            return categories.values().stream()
                .filter(child -> child.isChildOf(parent))
                .filter(child -> counts.containsKey(child.id().toString()) || selected.contains(child.id()))
                .map(
                    child -> new CategoryProductCount(child, counts.getOrDefault(child.id().toString(), 0L), List.of())
                )
                .toList();
        }

        List<SkinOptionProductCount> skinOptions(String scope, List<SkinType> selected, boolean sensitiveSelected) {
            Map<String, Long> counts = new LinkedHashMap<>(counts(scope + "_SKIN"));
            long sensitiveCount = rows.stream().filter(row -> row.section().equals(scope + "_SENSITIVE"))
                .mapToLong(Aggregate::amount).sum();
            counts.put(SkinChoice.SENSITIVE.name(), sensitiveCount);
            List<SkinChoice> selectedChoices = new ArrayList<>(selected.stream().map(SkinChoice::from).toList());
            if (sensitiveSelected) {
                selectedChoices.add(SkinChoice.SENSITIVE);
            }
            return Arrays.stream(SkinChoice.values())
                .filter(choice -> counts.getOrDefault(choice.name(), 0L) > 0 || selectedChoices.contains(choice))
                .map(choice -> new SkinOptionProductCount(choice, counts.getOrDefault(choice.name(), 0L)))
                .toList();
        }
    }
}
