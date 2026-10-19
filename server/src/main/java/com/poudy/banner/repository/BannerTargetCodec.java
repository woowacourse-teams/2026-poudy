package com.poudy.banner.repository;

import com.poudy.banner.domain.BannerTarget;
import com.poudy.curation.repository.CurationProductLinkQueryCodec;
import java.util.Set;
import java.util.stream.Collectors;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

public final class BannerTargetCodec {
    private static final JsonMapper JSON = JsonMapper.builder()
        .enable(DeserializationFeature.FAIL_ON_READING_DUP_TREE_KEY)
        .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();
    private final CurationProductLinkQueryCodec queryCodec = new CurationProductLinkQueryCodec();

    public BannerTarget decode(String document) {
        if (document == null) {
            throw new IllegalArgumentException("배너 target이 필요합니다.");
        }
        JsonNode node;
        try {
            node = JSON.readTree(document);
        } catch (JacksonException exception) {
            throw new IllegalArgumentException("배너 target JSON을 해석할 수 없습니다.");
        }
        if (node == null || !node.isObject() || !node.has("type") || !node.get("type").isTextual()) {
            throw new IllegalArgumentException("배너 target 타입이 필요합니다.");
        }
        return switch (node.get("type").stringValue()) {
            case "CURATION" -> {
                fields(node, "curationId");
                JsonNode id = node.get("curationId");
                if (!id.isIntegralNumber() || !id.canConvertToLong()) {
                    throw new IllegalArgumentException("큐레이션 ID는 64비트 정수여야 합니다.");
                }
                yield new BannerTarget.Curation(id.longValue());
            }
            case "PRODUCT_LIST" -> {
                fields(node, "query");
                yield new BannerTarget.ProductList(queryCodec.decode(node.get("query")));
            }
            case "EXTERNAL" -> {
                fields(node, "url");
                if (!node.get("url").isTextual()) {
                    throw new IllegalArgumentException("외부 배너 URL은 문자열이어야 합니다.");
                }
                yield new BannerTarget.External(node.get("url").stringValue());
            }
            default -> throw new IllegalArgumentException("지원하지 않는 배너 target입니다.");
        };
    }

    private void fields(JsonNode node, String value) {
        if (!node.propertyStream().map(java.util.Map.Entry::getKey).collect(Collectors.toSet())
            .equals(Set.of("type", value))) {
            throw new IllegalArgumentException("배너 target의 필드가 올바르지 않습니다.");
        }
    }
}
