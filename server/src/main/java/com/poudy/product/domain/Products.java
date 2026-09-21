package com.poudy.product.domain;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/** 요청에서 참조한 상품을 ID와 요청 순서로 해석한다. */
public final class Products {
    private final Map<Long, Product> products;
    private Products(Map<Long, Product> products) {
        this.products = products;
    }

    public static Products from(List<Product> products) {
        Map<Long, Product> indexed = new LinkedHashMap<>();
        for (Product product : Objects.requireNonNullElse(products, List.<Product>of())) {
            if (indexed.putIfAbsent(product.id(), product) != null) {
                throw new IllegalArgumentException("제품 ID가 중복됐습니다: " + product.id());
            }
        }
        return new Products(Collections.unmodifiableMap(indexed));
    }

    public Optional<Product> findById(Long id) {
        return Optional.ofNullable(products.get(id));
    }

    public List<Product> findAllById(List<Long> ids) {
        return ids == null ? List.of() : ids.stream().filter(products::containsKey).map(products::get).toList();
    }
}
