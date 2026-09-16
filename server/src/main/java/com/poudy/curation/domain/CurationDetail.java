package com.poudy.curation.domain;

import com.poudy.product.domain.Products;
import java.util.List;
import java.util.Objects;

public record CurationDetail(Curation curation, List<CurationBlockContent> blocks) {
    public CurationDetail {
        Objects.requireNonNull(curation);
        blocks = List.copyOf(blocks);
    }

    public static CurationDetail from(Curation curation, Products products) {
        Objects.requireNonNull(curation);
        Objects.requireNonNull(products);
        return new CurationDetail(curation, curation.visibleBlocks(products));
    }
}
