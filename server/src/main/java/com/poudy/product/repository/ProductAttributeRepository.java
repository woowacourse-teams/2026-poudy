package com.poudy.product.repository;

import com.poudy.product.domain.ProductAttributeOption;
import com.poudy.product.domain.ProductAttributeSelection;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.SqlArrayValue;
import org.springframework.stereotype.Repository;

@Repository
public class ProductAttributeRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public ProductAttributeRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean containsAll(List<ProductAttributeSelection> selections) {
        if (selections.isEmpty()) {
            return true;
        }
        Long found = jdbc.queryForObject("""
            select count(*) from attribute a join attribute_value av on av.attribute_id = a.id
            where a.code || ':' || av.value_code = any(:keys)
            """, Map.of("keys", keys(selections.stream().map(ProductAttributeSelection::key).toList())), Long.class);
        return found != null && found == selections.size();
    }

    public List<ProductAttributeOption> options(
        Map<String, Long> counts,
        List<ProductAttributeSelection> selections,
        List<Long> categoryIds
    ) {
        List<String> wanted = Stream
            .concat(counts.keySet().stream(), selections.stream().map(ProductAttributeSelection::key))
            .distinct().toList();
        if (wanted.isEmpty()) {
            return List.of();
        }
        List<OptionRow> rows = jdbc.query(
            """
                with roots as (select distinct coalesce(parent_id, id) as id from category where id = any(:categories))
                select a.code, a.name, av.value_code, av.name as value_name from attribute a
                join attribute_value av on av.attribute_id = a.id
                left join category_attribute ca on ca.attribute_id = a.id and ca.category_id in (select id from roots)
                where a.code || ':' || av.value_code = any(:keys)
                group by a.id, a.code, a.name, av.value_code, av.name, av.display_order
                order by case when (select count(*) from roots) = 1 then coalesce(min(ca.display_order), 2147483647) else 0 end,
                    a.code collate "C", av.display_order, av.value_code collate "C"
                """,
            Map.of("keys", keys(wanted), "categories", new SqlArrayValue("bigint", categoryIds.toArray())),
            (rs, row) -> new OptionRow(
                rs.getString("code"),
                rs.getString("name"),
                rs.getString("value_code"),
                rs.getString("value_name")
            )
        );
        Map<String, List<ProductAttributeOption.Value>> groups = new LinkedHashMap<>();
        Map<String, String> names = new LinkedHashMap<>();
        for (OptionRow row : rows) {
            names.put(row.code(), row.name());
            groups.computeIfAbsent(row.code(), ignored -> new ArrayList<>()).add(
                new ProductAttributeOption.Value(
                    row.valueCode(),
                    row.valueName(),
                    counts.getOrDefault(row.code() + ":" + row.valueCode(), 0L)
                )
            );
        }
        return groups.entrySet().stream()
            .map(group -> new ProductAttributeOption(group.getKey(), names.get(group.getKey()), group.getValue()))
            .toList();
    }

    private static SqlArrayValue keys(List<String> values) {
        return new SqlArrayValue("text", values.toArray());
    }

    private record OptionRow(String code, String name, String valueCode, String valueName) {
    }
}
