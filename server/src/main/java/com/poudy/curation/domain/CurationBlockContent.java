package com.poudy.curation.domain;

import com.poudy.product.domain.Product;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public sealed interface CurationBlockContent permits CurationBlockContent.Image, CurationBlockContent.Products,
    CurationBlockContent.ProductsByFilter {

    UUID id();

    int spacingTop();

    int spacingBottom();

    record Image(UUID id, int spacingTop, int spacingBottom, String imageUrl) implements CurationBlockContent {
        public Image {
            validate(id, spacingTop, spacingBottom);
            if (imageUrl == null || imageUrl.isBlank()) {
                throw new IllegalArgumentException("공개 이미지 블록의 URL이 필요합니다.");
            }
        }
    }

    record Products(
        UUID id,
        int spacingTop,
        int spacingBottom,
        List<Product> products) implements CurationBlockContent {
        public Products {
            validate(id, spacingTop, spacingBottom);
            products = List.copyOf(products);
            if (products.isEmpty()) {
                throw new IllegalArgumentException("공개 제품 블록에는 제품이 필요합니다.");
            }
        }
    }

    record ProductsByFilter(
        UUID id,
        int spacingTop,
        int spacingBottom,
        List<CurationFilter> filters,
        List<FilteredProduct> products) implements CurationBlockContent {
        public ProductsByFilter {
            validate(id, spacingTop, spacingBottom);
            filters = List.copyOf(filters);
            products = List.copyOf(products);
            if (filters.isEmpty() || products.isEmpty()) {
                throw new IllegalArgumentException("공개 필터 기준 제품 블록에는 필터와 제품이 필요합니다.");
            }
        }
    }

    record FilteredProduct(Product product, List<UUID> filterIds) {
        public FilteredProduct {
            Objects.requireNonNull(product);
            filterIds = List.copyOf(filterIds);
        }

        public boolean belongsTo(UUID filterId) {
            return filterIds.contains(filterId);
        }
    }

    private static void validate(UUID id, int spacingTop, int spacingBottom) {
        Objects.requireNonNull(id);
        if (spacingTop < 0 || spacingBottom < 0) {
            throw new IllegalArgumentException("블록 여백은 음수일 수 없습니다.");
        }
    }
}
