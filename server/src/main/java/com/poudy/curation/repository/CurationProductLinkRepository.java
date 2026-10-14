package com.poudy.curation.repository;

import com.poudy.curation.domain.CurationBlockContent.ProductLink;
import com.poudy.excludecode.domain.ExcludeCode;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.SqlArrayValue;
import org.springframework.stereotype.Repository;

/** 링크 조건의 참조를 요청당 종류별로 한 번씩 조회한다. 제품 존재/검색 결과 수와는 무관하다. */
@Repository
public class CurationProductLinkRepository {
    private final NamedParameterJdbcTemplate jdbc;

    public CurationProductLinkRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Set<UUID> findInvalidBlockIds(List<ProductLink> links) {
        Set<Long> brands = existingIds(
            "brand",
            links.stream().flatMap(link -> link.query().brandIds().stream()).toList()
        );
        Set<Long> categories = existingIds(
            "category",
            links.stream().flatMap(link -> link.query().categoryIds().stream()).toList()
        );
        Set<Long> ingredients = existingIds(
            "ingredient",
            links.stream().flatMap(link -> link.query().includeIngredientIds().stream()).toList()
        );
        List<String> codes = links.stream().flatMap(link -> link.query().includeGroupCodes().stream()).distinct()
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
        return links.stream()
            .filter(link -> link.query().hasMissingReferences(brands, categories, ingredients, groups))
            .map(ProductLink::id).collect(Collectors.toSet());
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
