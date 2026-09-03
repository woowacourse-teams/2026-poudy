package com.poudy.share.domain;

import com.poudy.product.domain.Product;
import java.util.Objects;
import java.util.Optional;

public final class ShareMatch {

    private final ShareMatchStatus status;
    private final Optional<Product> product;
    private final String keyword;

    public ShareMatch(ShareMatchStatus status, Optional<Product> product, String keyword) {
        Optional<Product> normalizedProduct = Objects.requireNonNullElse(product, Optional.empty());
        String normalizedKeyword = Objects.requireNonNullElse(keyword, "");

        if (status == null) {
            throw new IllegalArgumentException("제품 확정 여부가 필요합니다.");
        }
        if (status == ShareMatchStatus.MATCHED && normalizedProduct.isEmpty()) {
            throw new IllegalArgumentException("확정한 결과는 제품을 가져야 합니다.");
        }
        if (status == ShareMatchStatus.NOT_FOUND && normalizedProduct.isPresent()) {
            throw new IllegalArgumentException("확정하지 못한 결과는 제품을 가질 수 없습니다.");
        }

        this.status = status;
        this.product = normalizedProduct;
        this.keyword = normalizedKeyword;
    }

    public static ShareMatch matched(Product product) {
        return new ShareMatch(ShareMatchStatus.MATCHED, Optional.of(product), "");
    }

    public static ShareMatch notFound(String keyword) {
        return new ShareMatch(ShareMatchStatus.NOT_FOUND, Optional.empty(), keyword);
    }

    public ShareMatchStatus status() {
        return status;
    }

    public Optional<Product> product() {
        return product;
    }

    public String keyword() {
        return keyword;
    }

    public boolean isNotFound() {
        return status == ShareMatchStatus.NOT_FOUND;
    }

    public Long productId() {
        return product.map(Product::id).orElse(null);
    }
}
