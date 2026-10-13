package com.poudy.curation.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.product.domain.Products;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.LongStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class CurationProductLinkTest {
    @Test
    void projectsLinkWithoutRequiringMatchingProductsAndCopiesConditions() {
        List<Long> brands = new java.util.ArrayList<>(List.of(1L));
        CurationProductLinkQuery query = new CurationProductLinkQuery(null, brands, List.of(), List.of(), List.of());
        CurationBlock block = CurationBlock.productLink(UUID.randomUUID(), 8, 24, "제품 보러가기", query);
        brands.clear();

        CurationBlockContent.ProductLink content = (CurationBlockContent.ProductLink) block
            .resolveContent(Products.from(List.of())).orElseThrow();
        assertThat(content.query().brandIds()).containsExactly(1L);
        assertThat(query.hasMissingReferences(Set.of(1L), Set.of(), Set.of(), Set.of())).isFalse();
        assertThat(query.hasMissingReferences(Set.of(), Set.of(), Set.of(), Set.of())).isTrue();
        assertThat(content.spacingTop()).isEqualTo(8);
        assertThat(content.spacingBottom()).isEqualTo(24);
        assertThatThrownBy(() -> content.query().brandIds().clear()).isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void judgesEveryReferenceWithoutBroadeningCombinedConditions() {
        CurationProductLinkQuery query = new CurationProductLinkQuery(
            "토너",
            List.of(1L),
            List.of(2L),
            List.of(3L),
            List.of("RETINOIDS")
        );
        assertThat(query.hasMissingReferences(Set.of(1L), Set.of(2L), Set.of(3L), Set.of("RETINOIDS"))).isFalse();
        assertThat(query.hasMissingReferences(Set.of(2L), Set.of(2L), Set.of(3L), Set.of("RETINOIDS"))).isTrue();
        assertThat(query.hasMissingReferences(Set.of(1L), Set.of(1L), Set.of(3L), Set.of("RETINOIDS"))).isTrue();
        assertThat(query.hasMissingReferences(Set.of(1L), Set.of(2L), Set.of(2L), Set.of("RETINOIDS"))).isTrue();
        assertThat(query.hasMissingReferences(Set.of(1L), Set.of(2L), Set.of(3L), Set.of("CERAMIDES"))).isTrue();
    }

    @Test
    void rejectsUnboundedDuplicateOrNonPositiveIdsInEveryCondition() {
        for (List<Long> ids : List
            .of(List.of(0L), List.of(-1L), List.of(1L, 1L), LongStream.rangeClosed(1, 101).boxed().toList())) {
            assertThatThrownBy(() -> new CurationProductLinkQuery(null, ids, List.of(), List.of(), List.of()))
                .isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> new CurationProductLinkQuery(null, List.of(), ids, List.of(), List.of()))
                .isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> new CurationProductLinkQuery(null, List.of(), List.of(), ids, List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    void requiresAConditionAndBoundsCodesAndLabel() {
        assertThatThrownBy(() -> new CurationProductLinkQuery(null, List.of(), List.of(), List.of(), List.of()))
            .isInstanceOf(IllegalArgumentException.class);
        for (List<String> codes : List.of(
            List.of(" "),
            List.of("RETINOIDS", "RETINOIDS"),
            LongStream.rangeClosed(1, 101).mapToObj(id -> "GROUP_" + id).toList()
        )) {
            assertThatThrownBy(() -> new CurationProductLinkQuery(null, List.of(), List.of(), List.of(), codes))
                .isInstanceOf(IllegalArgumentException.class);
        }
        CurationProductLinkQuery query = new CurationProductLinkQuery(
            null,
            List.of(1L),
            List.of(),
            List.of(),
            List.of()
        );
        for (String label : List.of("", " ", "가".repeat(101))) {
            assertThatThrownBy(() -> CurationBlock.productLink(UUID.randomUUID(), 0, 0, label, query))
                .isInstanceOf(IllegalArgumentException.class);
        }
        assertThat(CurationBlock.productLink(UUID.randomUUID(), 0, 0, "😀".repeat(100), query)).isNotNull();
        assertThat(
            new CurationProductLinkQuery(
                null,
                LongStream.rangeClosed(1, 100).boxed().toList(),
                List.of(),
                List.of(),
                List.of()
            )
        )
            .isNotNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "\u200B", "\u00A0"})
    void rejectsEmptySearchUsingProductSearchNormalization(String keyword) {
        assertThatThrownBy(() -> new CurationProductLinkQuery(keyword, List.of(1L), List.of(), List.of(), List.of()))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void appliesExistingSearchKeywordLengthRule() {
        assertThat(new CurationProductLinkQuery("가".repeat(100), List.of(), List.of(), List.of(), List.of()))
            .isNotNull();
        assertThatThrownBy(
            () -> new CurationProductLinkQuery("가".repeat(101), List.of(), List.of(), List.of(), List.of())
        )
            .isInstanceOf(IllegalArgumentException.class);
    }
}
