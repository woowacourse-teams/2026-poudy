package com.poudy.curation.repository;

import com.poudy.curation.domain.CurationProductLinkQuery;
import java.util.Set;
import java.util.stream.Collectors;
import tools.jackson.databind.JsonNode;

public final class CurationProductLinkQueryCodec {
    private static final Set<String> FIELDS = Set.of(
        "keyword",
        "brandIds",
        "categoryIds",
        "includeIngredientIds",
        "includeGroupCodes"
    );

    public CurationProductLinkQuery decode(JsonNode node) {
        if (node == null || !node.isObject()
            || !node.propertyStream().map(java.util.Map.Entry::getKey).collect(Collectors.toSet()).equals(FIELDS)) {
            throw invalid("객체의 필수 필드가 누락됐거나 알 수 없는 필드가 있습니다.");
        }
        return new CurationProductLinkQuery(
            node.get("keyword").isNull() ? null : text(node.get("keyword")),
            array(node.get("brandIds")).valueStream().map(this::integer).toList(),
            array(node.get("categoryIds")).valueStream().map(this::integer).toList(),
            array(node.get("includeIngredientIds")).valueStream().map(this::integer).toList(),
            array(node.get("includeGroupCodes")).valueStream().map(this::text).toList()
        );
    }

    private JsonNode array(JsonNode node) {
        if (!node.isArray()) {
            throw invalid("배열이 필요합니다.");
        }
        return node;
    }

    private String text(JsonNode node) {
        if (!node.isTextual()) {
            throw invalid("문자열이 필요합니다.");
        }
        return node.stringValue();
    }

    private long integer(JsonNode node) {
        if (!node.isIntegralNumber() || !node.canConvertToLong()) {
            throw invalid("64비트 정수가 필요합니다.");
        }
        return node.longValue();
    }

    private IllegalArgumentException invalid(String message) {
        return new IllegalArgumentException("큐레이션 본문: " + message);
    }
}
