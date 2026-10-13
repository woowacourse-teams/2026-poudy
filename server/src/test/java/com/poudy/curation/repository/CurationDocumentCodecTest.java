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
