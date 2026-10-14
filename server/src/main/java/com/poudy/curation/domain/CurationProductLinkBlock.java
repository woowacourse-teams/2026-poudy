package com.poudy.curation.domain;

import com.poudy.product.domain.Products;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

final class CurationProductLinkBlock extends CurationBlock {
    private final String label;
    private final CurationProductLinkQuery query;

    CurationProductLinkBlock(UUID id, int spacingTop, int spacingBottom, String label, CurationProductLinkQuery query) {
        super(id, spacingTop, spacingBottom);
        if (label == null || label.isBlank() || label.codePointCount(0, label.length()) > 100) {
            throw new IllegalArgumentException("제품 링크 문구는 공백이 아닌 100자 이하 문자열이어야 합니다.");
        }
        this.label = label;
        this.query = Objects.requireNonNull(query);
    }

    @Override
    Optional<CurationBlockContent> resolveContent(Products products) {
        return Optional.of(new CurationBlockContent.ProductLink(id(), spacingTop(), spacingBottom(), label, query));
    }
}
