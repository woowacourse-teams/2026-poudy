package com.poudy.share.domain;

import com.poudy.product.domain.Product;
import java.util.Objects;
import java.util.Optional;

public record ShareMatch(ShareMatchStatus status, Optional<Product> product, String keyword) {

    public ShareMatch {
        product = Objects.requireNonNullElse(product, Optional.empty());
        keyword = Objects.requireNonNullElse(keyword, "");
    }

    public static ShareMatch matched(Product product) {
        return new ShareMatch(ShareMatchStatus.MATCHED, Optional.of(product), "");
    }

    public static ShareMatch notFound(String keyword) {
        return new ShareMatch(ShareMatchStatus.NOT_FOUND, Optional.empty(), keyword);
    }

    public boolean isNotFound() {
        return status == ShareMatchStatus.NOT_FOUND;
    }

    public Long productId() {
        return product.map(Product::id).orElse(null);
    }
}
