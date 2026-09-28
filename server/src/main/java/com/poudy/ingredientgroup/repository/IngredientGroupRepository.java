package com.poudy.ingredientgroup.repository;

import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.mapping;
import static java.util.stream.Collectors.toList;

import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.ingredientgroup.domain.IngredientGroup;
import com.poudy.ingredientgroup.domain.IngredientGroupCatalog;
import com.poudy.ingredientgroup.domain.IngredientGroupDetail;
import com.poudy.ingredientgroup.domain.IngredientGroupMember;
import com.poudy.ingredientgroup.domain.IngredientGroupSuggestion;
import java.util.LinkedHashMap;
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
public class IngredientGroupRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public IngredientGroupRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public IngredientGroupCatalog findBundlingGroups() {
        return new IngredientGroupCatalog(
            findGroups("", excludeCodeParameters()).entrySet().stream()
                .map(entry -> new IngredientGroup(entry.getKey().code(), entry.getKey().name(), entry.getValue()))
                .toList()
        );
    }

    public boolean containsAll(List<String> codes) {
        if (codes.isEmpty()) {
            return true;
        }
        Long count = jdbc.queryForObject(
            "select count(*) from ingredient_group where code = any(:codes) and code <> all(:excludeCodes)",
            excludeCodeParameters().addValue("codes", new SqlArrayValue("text", codes.toArray())),
            Long.class
        );
        return count != null && count == codes.size();
    }

    public List<IngredientGroupSuggestion> suggest(String keyword) {
        return findGroups(
            " and strpos(replace(lower(g.display_name), ' ', ''), replace(lower(:keyword), ' ', '')) > 0",
            excludeCodeParameters().addValue("keyword", keyword)
        ).entrySet().stream()
            .map(entry -> new IngredientGroupSuggestion(entry.getKey().code(), entry.getKey().name(), entry.getValue()))
            .toList();
    }

    public Optional<IngredientGroupDetail> findDetail(String code) {
        MapSqlParameterSource parameters = new MapSqlParameterSource("code", code);
        List<IngredientGroupMember> members = jdbc.query(
            "select i.id, i.korean_name, i.english_name from ingredient_group_ingredient m"
                + " join ingredient i on i.id = m.ingredient_id where m.group_code = :code order by m.display_order",
            parameters,
            (row, number) -> new IngredientGroupMember(
                row.getLong("id"),
                row.getString("korean_name"),
                row.getString("english_name")
            )
        );

        return jdbc.query(
            "select code, display_name, description from ingredient_group where code = :code",
            parameters,
            (row, number) -> new IngredientGroupDetail(
                row.getString("code"),
                row.getString("display_name"),
                row.getString("description"),
                members
            )
        ).stream().findFirst();
    }

    private Map<GroupKey, List<Long>> findGroups(String condition, MapSqlParameterSource parameters) {
        return jdbc.query(
            "select g.code, g.display_name, m.ingredient_id from ingredient_group g"
                + " join ingredient_group_ingredient m on m.group_code = g.code"
                + " where g.code <> all(:excludeCodes)" + condition
                + " order by g.code, m.display_order",
            parameters,
            (row, number) -> new MemberRow(
                new GroupKey(row.getString("code"), row.getString("display_name")),
                row.getLong("ingredient_id")
            )
        ).stream()
            .collect(groupingBy(MemberRow::group, LinkedHashMap::new, mapping(MemberRow::ingredientId, toList())));
    }

    private static MapSqlParameterSource excludeCodeParameters() {
        return new MapSqlParameterSource("excludeCodes", new SqlArrayValue("text", ExcludeCode.codeValues().toArray()));
    }

    private record GroupKey(String code, String name) {
    }

    private record MemberRow(GroupKey group, Long ingredientId) {
    }
}
