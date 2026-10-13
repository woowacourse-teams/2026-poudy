package com.poudy.curation.repository;

import com.poudy.curation.domain.CurationBlock;
import com.poudy.curation.domain.CurationFilter;
import com.poudy.curation.domain.CurationProductLinkQuery;
import com.poudy.curation.domain.CurationProductMapping;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** 저장 문서만 해석한다. 공개 API의 JSON 설정이나 도메인에 저장 형식을 전파하지 않는다. */
public final class CurationDocumentCodec {
    private static final JsonMapper JSON = JsonMapper.builder()
        .enable(DeserializationFeature.FAIL_ON_READING_DUP_TREE_KEY)
        .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
        .build();
    private static final Set<String> COMMON = Set.of("id", "type", "spacingTop", "spacingBottom");

    public List<CurationBlock> decode(String document) {
        return blocks(read(document));
    }

    private JsonNode read(String document) {
        if (document == null) {
            throw invalid("본문이 필요합니다.");
        }
        try {
            return JSON.readTree(document);
        } catch (JacksonException exception) {
            // Jackson의 메시지는 입력 본문을 포함할 수 있으므로 운영 오류에 노출하지 않는다.
            throw invalid("JSON을 해석할 수 없습니다.");
        }
    }

    private List<CurationBlock> blocks(JsonNode document) {
        List<CurationBlock> blocks = array(document).valueStream().map(this::block).toList();
        if (blocks.stream().map(CurationBlock::id).distinct().count() != blocks.size()) {
            throw invalid("블록 ID가 중복됐습니다.");
        }
        return blocks;
    }

    private CurationBlock block(JsonNode node) {
        if (node == null || !node.isObject()) {
            throw invalid("블록은 객체여야 합니다.");
        }
        String type = text(node.get("type"));
        Set<String> expected = new HashSet<>(COMMON);
        expected.addAll(switch (type) {
            case "IMAGE" -> Set.of("imageUrl", "altText", "bodyText");
            case "PRODUCTS" -> Set.of("productIds");
            case "PRODUCTS_BY_FILTER" -> Set.of("filters", "products");
            case "PRODUCT_LINK" -> Set.of("label", "query");
            default -> throw invalid("지원하지 않는 블록 타입입니다.");
        });
        fields(node, expected);
        UUID id = uuid(node.get("id"));
        int top = spacing(node.get("spacingTop"));
        int bottom = spacing(node.get("spacingBottom"));
        return switch (type) {
            case "IMAGE" -> CurationBlock.image(
                id,
                top,
                bottom,
                text(node.get("imageUrl")),
                nullableText(node.get("altText")),
                nullableText(node.get("bodyText"))
            );
            case "PRODUCTS" -> CurationBlock.products(
                id,
                top,
                bottom,
                array(node.get("productIds")).valueStream().map(this::integer).toList()
            );
            case "PRODUCTS_BY_FILTER" -> CurationBlock.productsByFilter(
                id,
                top,
                bottom,
                array(node.get("filters")).valueStream().map(this::filter).toList(),
                array(node.get("products")).valueStream().map(this::product).toList()
            );
            case "PRODUCT_LINK" -> CurationBlock.productLink(
                id,
                top,
                bottom,
                text(node.get("label")),
                query(node.get("query"))
            );
            default -> throw invalid("지원하지 않는 블록 타입입니다.");
        };
    }

    private CurationProductLinkQuery query(JsonNode node) {
        fields(node, Set.of("keyword", "brandIds", "categoryIds", "includeIngredientIds", "includeGroupCodes"));
        return new CurationProductLinkQuery(
            nullableText(node.get("keyword")),
            array(node.get("brandIds")).valueStream().map(this::integer).toList(),
            array(node.get("categoryIds")).valueStream().map(this::integer).toList(),
            array(node.get("includeIngredientIds")).valueStream().map(this::integer).toList(),
            array(node.get("includeGroupCodes")).valueStream().map(this::text).toList()
        );
    }

    private CurationFilter filter(JsonNode node) {
        fields(node, Set.of("id", "label"));
        return new CurationFilter(uuid(node.get("id")), text(node.get("label")));
    }

    private CurationProductMapping product(JsonNode node) {
        fields(node, Set.of("productId", "filterIds"));
        return new CurationProductMapping(
            integer(node.get("productId")),
            array(node.get("filterIds")).valueStream().map(this::uuid).toList()
        );
    }

    private void fields(JsonNode node, Set<String> expected) {
        if (node == null || !node.isObject()
            || !node.propertyStream().map(java.util.Map.Entry::getKey).collect(Collectors.toSet())
                .equals(expected)) {
            throw invalid("객체의 필수 필드가 누락됐거나 알 수 없는 필드가 있습니다.");
        }
    }

    private JsonNode array(JsonNode node) {
        if (node == null || !node.isArray()) {
            throw invalid("배열이 필요합니다.");
        }
        return node;
    }

    private String text(JsonNode node) {
        if (node == null || !node.isTextual()) {
            throw invalid("문자열이 필요합니다.");
        }
        return node.stringValue();
    }

    private String nullableText(JsonNode node) {
        return node != null && node.isNull() ? null : text(node);
    }

    private UUID uuid(JsonNode node) {
        String value = text(node);
        try {
            UUID id = UUID.fromString(value);
            if (!id.toString().equalsIgnoreCase(value)) {
                throw invalid("UUID 형식이 올바르지 않습니다.");
            }
            return id;
        } catch (IllegalArgumentException exception) {
            throw invalid("UUID 형식이 올바르지 않습니다.");
        }
    }

    private long integer(JsonNode node) {
        if (node == null || !node.isIntegralNumber() || !node.canConvertToLong()) {
            throw invalid("64비트 정수가 필요합니다.");
        }
        return node.longValue();
    }

    private int spacing(JsonNode node) {
        long value = integer(node);
        if (value < 0 || value > Integer.MAX_VALUE) {
            throw invalid("여백은 0 이상인 32비트 정수여야 합니다.");
        }
        return (int) value;
    }

    private IllegalArgumentException invalid(String message) {
        return new IllegalArgumentException("큐레이션 본문: " + message);
    }

}
