package com.poudy.curation.repository;

import com.poudy.curation.domain.CurationBlockContent.ProductLink;
import com.poudy.curation.domain.CurationProductLinkQuery;
import com.poudy.excludecode.domain.ExcludeCode;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.SqlArrayValue;
import org.springframework.stereotype.Repository;

@Repository
public class CurationProductLinkRepository {
    private final NamedParameterJdbcTemplate jdbc;

    public CurationProductLinkRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Set<UUID> findInvalidBlockIds(List<ProductLink> links) {
        Set<CurationProductLinkQuery> invalid = findInvalidQueries(links.stream().map(ProductLink::query).toList());
        return links.stream().filter(link -> invalid.contains(link.query())).map(ProductLink::id)
            .collect(Collectors.toSet());
    }

    public Set<CurationProductLinkQuery> findInvalidQueries(List<CurationProductLinkQuery> queries) {
        Set<Long> brands = existingIds(
            "brand",
            queries.stream().flatMap(query -> query.brandIds().stream()).toList()
        );
        Set<Long> categories = existingIds(
            "category",
            queries.stream().flatMap(query -> query.categoryIds().stream()).toList()
        );
        Set<Long> ingredients = existingIds(
            "ingredient",
            queries.stream().flatMap(query -> query.includeIngredientIds().stream()).toList()
        );
        List<String> codes = queries.stream().flatMap(query -> query.includeGroupCodes().stream()).distinct()
            .toList();
        Set<String> groups = codes.isEmpty() ? Set.of() : Set.copyOf(
            jdbc.queryForList(
                "select code from ingredient_group where code = any(:codes) and code <> all(:excludeCodes)",
                Map.of(
                    "codes",
                    new SqlArrayValue("text", codes.toArray()),
                    "excludeCodes",
                    new SqlArrayValue("text", ExcludeCode.codeValues().toArray())
                ),
                String.class
            )
        );
        return queries.stream()
            .filter(query -> query.hasMissingReferences(brands, categories, ingredients, groups))
            .collect(Collectors.toSet());
    }

    private Set<Long> existingIds(String table, List<Long> ids) {
        if (ids.isEmpty()) {
            return Set.of();
        }
        return Set.copyOf(
            jdbc.queryForList(
                "select id from " + table + " where id = any(:ids)",
                Map.of("ids", new SqlArrayValue("bigint", ids.stream().distinct().toArray())),
                Long.class
            )
        );
    }
}
