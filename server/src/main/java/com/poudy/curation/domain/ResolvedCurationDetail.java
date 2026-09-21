package com.poudy.curation.domain;

import com.poudy.product.domain.Products;
import java.util.List;
import java.util.Objects;

public record ResolvedCurationDetail(Curation curation, List<CurationBlockContent> blocks) {
    public ResolvedCurationDetail {
        Objects.requireNonNull(curation);
        blocks = List.copyOf(blocks);
    }

    public static ResolvedCurationDetail from(Curation curation, Products products) {
        Objects.requireNonNull(curation);
        Objects.requireNonNull(products);
        return new ResolvedCurationDetail(curation, curation.resolveBlocks(products));
    }
}
