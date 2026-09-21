package com.poudy.ingredient.repository;

import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.mapping;
import static java.util.stream.Collectors.toList;
import static java.util.stream.Collectors.toMap;

import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientCatalog;
import com.poudy.ingredient.domain.IngredientMatchField;
import com.poudy.ingredient.domain.IngredientPage;
import com.poudy.ingredient.domain.IngredientSuggestion;
import com.poudy.ingredient.domain.IngredientTag;
import com.poudy.search.domain.MatchRange;
import com.poudy.tag.domain.Tag;
import com.poudy.tag.domain.TagCategory;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.IntStream;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.SqlArrayValue;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class IngredientRepository {

    private static final int SUGGESTION_LIMIT = 5;

    private final NamedParameterJdbcTemplate jdbc;

    public IngredientRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Ingredient> findById(Long id) {
        return load(List.of(id)).stream().findFirst();
    }

    public IngredientCatalog findByIds(List<Long> ids) {
        return IngredientCatalog.from(load(ids.stream().distinct().toList()));
    }

    public IngredientPage findPage(List<Long> ingredientIds, boolean usedInProducts, int page, int size) {
        if (page < 1 || size < 1) {
            throw new IllegalArgumentException("페이지 조건이 올바르지 않습니다.");
        }
        MapSqlParameterSource parameters = new MapSqlParameterSource()
            .addValue("offset", (long) (page - 1) * size)
            .addValue("size", size);
        String condition = " where true";
        String order = "i.id";
        if (!ingredientIds.isEmpty()) {
            parameters.addValue("ids", new SqlArrayValue("bigint", ingredientIds.toArray()));
            parameters.addValue("orderedIds", new SqlArrayValue("bigint", ingredientIds.toArray()));
            condition += " and i.id = any(cast(:ids as bigint[]))";
            order = "array_position(cast(:orderedIds as bigint[]), i.id)";
        }
        if (usedInProducts) {
            condition += " and exists (select 1 from product_ingredient pi where pi.ingredient_id = i.id)";
        }
        long total = jdbc.queryForObject("select count(*) from ingredient i" + condition, parameters, Long.class);
        List<Long> ids = jdbc.queryForList(
            "select i.id from ingredient i" + condition + " order by " + order + " limit :size offset :offset",
            parameters,
            Long.class
        );
        return new IngredientPage(load(ids), total);
    }

    public List<IngredientSuggestion> suggest(String keyword) {
        List<SearchHit> hits = jdbc.query(
            """
                select (hit->>'ingredientId')::bigint as id, hit->>'matchField' as field,
                       hit->>'matchText' as text, (hit->'matchRange'->>0)::int as start_index,
                       (hit->'matchRange'->>1)::int as end_index
                from search_ingredients(:keyword, 0, :limit)
                cross join lateral jsonb_array_elements(items) with ordinality as results(hit, position)
                order by position
                """,
            new MapSqlParameterSource("keyword", keyword).addValue("limit", SUGGESTION_LIMIT),
            (row, index) -> new SearchHit(
                row.getLong("id"),
                IngredientMatchField.valueOf(row.getString("field")),
                row.getString("text"),
                new MatchRange(row.getInt("start_index"), row.getInt("end_index"))
            )
        );
        List<Ingredient> ingredients = load(hits.stream().map(SearchHit::id).toList());
        return IntStream.range(0, hits.size())
            .mapToObj(index -> hits.get(index).withIngredient(ingredients.get(index)))
            .toList();
    }

    private List<Ingredient> load(List<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<String, Object> parameters = Map.of("ids", new SqlArrayValue("bigint", ids.toArray()));
        Map<Long, List<String>> aliases = texts(
            "select ingredient_id, alias as content from ingredient_alias"
                + " where ingredient_id = any(cast(:ids as bigint[])) order by ingredient_id, display_order",
            parameters
        );
        Map<Long, List<String>> sources = texts(
            "select ingredient_id, content from ingredient_source"
                + " where ingredient_id = any(cast(:ids as bigint[])) order by ingredient_id, display_order",
            parameters
        );
        Map<Long, List<IngredientTag>> tags = jdbc.query(
            """
                select it.ingredient_id, t.id, t.category, t.code, t.name,
                       array(select e.content from ingredient_tag_evidence e
                             where e.ingredient_id = it.ingredient_id and e.tag_id = it.tag_id
                             order by e.display_order) as evidence
                from ingredient_tag it join tag t on t.id = it.tag_id
                where it.ingredient_id = any(cast(:ids as bigint[]))
                order by it.ingredient_id, it.display_order
                """,
            parameters,
            (row, index) -> new TagRow(
                row.getLong("ingredient_id"),
                new IngredientTag(
                    new Tag(
                        row.getLong("id"),
                        TagCategory.valueOf(row.getString("category")),
                        row.getString("code"),
                        row.getString("name")
                    ),
                    List.of((String[]) row.getArray("evidence").getArray())
                )
            )
        ).stream().collect(groupingBy(TagRow::ingredientId, mapping(TagRow::tag, toList())));
        Map<Long, Ingredient> ingredients = jdbc.query(
            "select * from ingredient where id = any(cast(:ids as bigint[]))",
            parameters,
            (row, index) -> {
                long id = row.getLong("id");
                return new Ingredient(
                    id,
                    row.getString("korean_name"),
                    row.getString("english_name"),
                    row.getString("description"),
                    sources.getOrDefault(id, List.of()),
                    aliases.getOrDefault(id, List.of()),
                    tags.getOrDefault(id, List.of()),
                    row.getObject("updated_at", OffsetDateTime.class)
                );
            }
        ).stream().collect(toMap(Ingredient::id, ingredient -> ingredient));
        return ids.stream().filter(ingredients::containsKey).map(ingredients::get).toList();
    }

    private Map<Long, List<String>> texts(String sql, Map<String, Object> parameters) {
        return jdbc.query(
            sql,
            parameters,
            (row, index) -> new TextRow(
                row.getLong("ingredient_id"),
                row.getString("content")
            )
        ).stream().collect(groupingBy(TextRow::ingredientId, mapping(TextRow::content, toList())));
    }

    private record TextRow(long ingredientId, String content) {
    }

    private record TagRow(long ingredientId, IngredientTag tag) {
    }

    private record SearchHit(long id, IngredientMatchField field, String text, MatchRange range) {

        IngredientSuggestion withIngredient(Ingredient ingredient) {
            return new IngredientSuggestion(ingredient, field, text, range);
        }
    }
}
