package com.poudy.product.repository;

import static java.util.stream.Collectors.toMap;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.repository.BrandRepository;
import com.poudy.category.domain.Category;
import com.poudy.category.domain.CategoryProductCount;
import com.poudy.product.domain.Mark;
import com.poudy.product.domain.ProductAttributeSelection;
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
        with %srequested_attribute_values as materialized (
            select a.id as attribute_id, av.value_code from attribute a
            join attribute_value av on av.attribute_id = a.id
            where a.code || ':' || av.value_code = any(cast(:attributeSelections as text[]))
        ), requested_attribute_groups as (
            select distinct attribute_id from requested_attribute_values
        ), candidates as materialized (
            select p.*, c.parent_id, %s as search_rank,
                array(select g.attribute_id from requested_attribute_groups g where not exists (
                    select 1 from product_attribute_value pav
                    join requested_attribute_values wanted
                        on wanted.attribute_id = pav.attribute_id and wanted.value_code = pav.value_code
                    where pav.product_id = p.id and pav.attribute_id = g.attribute_id
                )) as unmatched_attributes,
                (cardinality(cast(:brands as bigint[])) = 0 or p.brand_id = any(:brands)) as brand_ok,
                (cardinality(cast(:categories as bigint[])) = 0
                    or p.category_id = any(:categories) or c.parent_id = any(:categories)) as category_ok,
                ((cardinality(cast(:skins as text[])) = 0 and not :sensitiveSkin)
                    or (:sensitiveSkin and p.is_sensitive_skin)
                    or exists (select 1 from product_skin_type s
                        where s.product_id = p.id and s.skin_type_code = any(:skins))) as skin_ok
            from product p %s join category c on c.id = p.category_id
            left join category root on root.id = c.parent_id
            where ((cardinality(cast(:moisture as double precision[])) = 0
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
        ), matched as (select * from candidates where brand_ok and category_ok and skin_ok and cardinality(unmatched_attributes) = 0)
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
                ('MATCH', brand_ok and category_ok and skin_ok and cardinality(unmatched_attributes) = 0),
                ('BRAND_OPTION', :options and category_ok and skin_ok and cardinality(unmatched_attributes) = 0),
                ('CATEGORY_OPTION', :options and brand_ok and skin_ok and cardinality(unmatched_attributes) = 0),
                ('SKIN_OPTION', :options and brand_ok and category_ok and cardinality(unmatched_attributes) = 0)) scope(name, eligible)
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
        union all select 'SKIN_OPTION_SENSITIVE', null::text, count(*) from scopes
            where name = 'SKIN_OPTION' and is_sensitive_skin
        union all select 'ATTRIBUTE_OPTION', a.code || ':' || pav.value_code, count(*)
            from candidates p join product_attribute_value pav on pav.product_id = p.id
            join attribute a on a.id = pav.attribute_id
            where :options and p.brand_ok and p.category_ok and p.skin_ok
                and p.unmatched_attributes <@ array[pav.attribute_id]
            group by a.code, pav.value_code
        """;

    private final NamedParameterJdbcTemplate jdbc;
    private final ProductLoader loader;
    private final BrandRepository brandRepository;
    private final Clock clock;
    private final ProductAttributeRepository attributeRepository;

    public ProductQueryRepository(
        NamedParameterJdbcTemplate jdbc,
        ProductLoader loader,
        BrandRepository brandRepository,
        Clock clock,
        ProductAttributeRepository attributeRepository
    ) {
        this.jdbc = jdbc;
        this.loader = loader;
        this.brandRepository = brandRepository;
        this.clock = clock.withZone(SEOUL);
        this.attributeRepository = attributeRepository;
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
        ProductFilterOptions filterOptions = null;
        if (page == 1) {
            filterOptions = new ProductFilterOptions(
                facets.brands("BRAND_OPTION"),
                facets.categories("CATEGORY_OPTION"),
                facets.skinTypes("SKIN_OPTION"),
                facets.sensitiveSkin(),
                attributeRepository.options(facets.counts("ATTRIBUTE_OPTION"), query.attributes(), query.categoryIds())
            );
        }
        return new ProductPage(
            cards(ids),
            total,
            facets.brands("MATCH"),
            facets.categories("MATCH"),
            facets.skinTypes("MATCH"),
            filterOptions
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
                search_products_v2(:keyword, :offset, :size, 2) result
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
                    with result as materialized (
                        select coalesce(corrected_query, :keyword) as query, items from search_products_v2(:keyword, 0, :limit, 2)
                    ), tokens as materialized (
                        select t.* from result, search_query_tokens(result.query) t
                    ), metadata as materialized (
                        select m.* from result, search_product_metadata_hits(result.query) m where m.ord > 0
                    ), hits as (
                        select item.position, result.query, d.*
                        from result, jsonb_array_elements(result.items) with ordinality item(value, position)
                        join product_search_document d on d.product_id = (item.value ->> 'productId')::bigint
                    ), prefixed as (
                        select h.position, h.query, h.product_name, case
                            when greatest(strpos(h.product_norm, search_norm(h.query)),
                                strpos(h.product_read, search_norm(h.query)),
                                strpos(h.product_chosung, search_norm(h.query))) > 0 then null
                            else coalesce(nullif(concat_ws(' ',
                                case when exists (select 1 from tokens t
                                    where (h.brand_norm like '%' || t.norm || '%' or h.brand_read like '%' || t.read || '%')
                                      and h.product_norm not like '%' || t.norm || '%'
                                      and h.product_read not like '%' || t.read || '%')
                                    then h.brand_korean_name end,
                                (select string_agg(m.text, ' ' order by m.ord, m.text) from (
                                    select distinct on (m.text) m.text, m.ord from metadata m
                                    where m.product_id = h.product_id
                                      and h.product_norm not like '%' || m.query || '%'
                                      and h.product_read not like '%' || m.query || '%'
                                    order by m.text, m.ord) m)
                            ), ''), h.brand_korean_name) end as prefix
                        from hits h
                    ), keywords as (
                        select position, query, prefix, concat_ws(' ', prefix, product_name) as keyword from prefixed
                    )
                    select keyword, coalesce(search_match_range(keyword, query),
                        array[0, search_utf16_index(keyword, length(prefix))]) as match_range
                    from keywords
                    where search_utf16_index(keyword, length(keyword)) <= :maxLength
                    order by position
                    """,
                Map.of("keyword", keyword, "limit", limit, "maxLength", SearchKeyword.MAX_LENGTH),
                (rs, row) -> {
                    Integer[] range = (Integer[]) rs.getArray("match_range").getArray();
                    return new RelatedKeyword(rs.getString("keyword"), new MatchRange(range[0], range[1]));
                }
            )
        );
    }

    private Map<Long, SuggestionDisplay> suggestionDisplays(List<Long> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        List<SuggestionDisplay> products = jdbc.query(
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
                    marks.getOrDefault(rs.getLong("id"), List.of()),
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
        String cte = "";
        String searchRank = "null::bigint";
        String searchedJoin = "";
        if (query.hasKeyword()) {
            String searchedCte = """
                select (item ->> 'productId')::bigint as id, (item ->> 'rank')::bigint as search_rank
                from search_products_v2(:keyword, 0, null, 2) result, jsonb_array_elements(result.items) item
                """;
            cte = "searched as materialized (" + searchedCte + "), ";
            searchRank = "searched.search_rank";
            searchedJoin = "join searched on searched.id = p.id";
        }
        String included = "";
        if (query.hasIncludedIngredients()) {
            included = INCLUDED;
        }
        String excluded = "";
        if (query.hasExcludeConditions()) {
            excluded = EXCLUDED;
        }
        return CANDIDATES.formatted(cte, searchRank, searchedJoin, included, excluded);
    }

    private static String orderBy(ProductQuery query, ProductSort sort) {
        return switch (sort) {
            case DEFAULT -> defaultOrderBy(query);
            case CREATED_ASC -> "m.created_at asc";
            case PRICE_DESC -> "v.price desc";
            case PRICE_ASC -> "v.price asc";
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
        return "case when v.volume_unit = 'ea' or v.volume_value = 0 then 1 else 0 end asc, "
            + "case when v.volume_unit <> 'ea' and v.volume_value > 0 "
            + "then v.price::numeric / nullif(v.volume_value, 0) end " + direction + " nulls last";
    }

    private MapSqlParameterSource parameters(ProductQuery query) {
        return new MapSqlParameterSource("keyword", query.keyword())
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
                "attributeSelections",
                array(
                    "text",
                    query.attributes().stream().map(ProductAttributeSelection::key).toList()
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

        boolean sensitiveSkin() {
            return rows.stream().anyMatch(r -> r.section().equals("SKIN_OPTION_SENSITIVE") && r.amount() > 0);
        }
    }
}
