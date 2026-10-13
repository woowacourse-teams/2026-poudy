package com.poudy.curation.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;

class CurationDocumentCodecTest {
    private static final String PRODUCTS = """
        [{"id":"00000000-0000-4000-8000-000000000001","type":"PRODUCTS",
          "spacingTop":0,"spacingBottom":24,"productIds":[15,10]}]
        """;
    private final CurationDocumentCodec codec = new CurationDocumentCodec();
    private static final String LINK = """
        [{"id":"00000000-0000-4000-8000-000000000001","type":"PRODUCT_LINK",
          "spacingTop":0,"spacingBottom":24,"label":"제품 보러가기",
          "query":{"keyword":null,"brandIds":[1],"categoryIds":[],"includeIngredientIds":[],"includeGroupCodes":[]}}]
        """;

    @Test
    void readsExplicitProductLinkConditions() {
        assertThat(codec.decode(LINK)).hasSize(1);
        assertThat(codec.decode(LINK.replace("\"keyword\":null", "\"keyword\":\"토너\""))).hasSize(1);
    }

    @Test
    void rejectsMalformedLinkQueriesAndArbitraryUrls() {
        for (String document : List.of(
            LINK.replace("\"brandIds\":[1]", "\"brandIds\":[\"1\"]"),
            LINK.replace("\"brandIds\":[1]", "\"brandIds\":[1.5]"),
            LINK.replace("\"brandIds\":[1]", "\"brandIds\":[null]"),
            LINK.replace("\"brandIds\":[1]", "\"brandIds\":[9223372036854775808]"),
            LINK.replace("\"brandIds\":[1]", "\"brandIds\":null"),
            LINK.replace("\"keyword\":null,", ""),
            LINK.replace("\"keyword\":null", "\"keyword\":3"),
            LINK.replace("\"includeGroupCodes\":[]", "\"includeGroupCodes\":[1]"),
            LINK.replace("\"query\":{", "\"href\":\"https://example.com\",\"query\":{"),
            LINK.replace("\"query\":{", "\"query\":{\"page\":2,"),
            LINK.replace("\"query\":{", "\"query\":{\"sort\":\"PRICE_ASC\","),
            LINK.replace("\"label\":\"제품 보러가기\"", "\"label\":null")
        )) {
            assertThatThrownBy(() -> codec.decode(document)).isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    void readsProductsAndAllowsEmptyBody() {
        assertThat(codec.decode(PRODUCTS)).hasSize(1);
        assertThat(codec.decode("[]")).isEmpty();
    }

    @Test
    void rejectsUnsupportedOrIncompleteDocuments() {
        for (String document : List.of(
            "{}",
            PRODUCTS.replace("\"PRODUCTS\"", "\"UNKNOWN\""),
            PRODUCTS.replace("\"spacingTop\":0,", ""),
            PRODUCTS.replace("\"spacingTop\":0", "\"spacingTop\":0,\"spacingTop\":1")
        )) {
            assertThatThrownBy(() -> codec.decode(document)).isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    void rejectsProductIdsThatCannotBeReadAsIntegers() {
        for (String ids : List.of("[\"15\"]", "[15.5]", "[9223372036854775808]")) {
            assertThatThrownBy(() -> codec.decode(PRODUCTS.replace("[15,10]", ids)))
                .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    void rejectsFiltersFromAnotherBlock() {
        assertThatThrownBy(() -> codec.decode("""
            [{"id":"00000000-0000-4000-8000-000000000001","type":"PRODUCTS_BY_FILTER",
              "spacingTop":0,"spacingBottom":0,
              "filters":[{"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","label":"필터"}],
              "products":[{"productId":10,"filterIds":["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"]}]}]
            """)).isInstanceOf(IllegalArgumentException.class);
    }

}
