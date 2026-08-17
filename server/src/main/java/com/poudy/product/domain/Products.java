package com.poudy.product.domain;

import com.poudy.brand.domain.Brand;
import com.poudy.common.domain.SearchKeyword;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

public class Products {

    private final List<Product> products;
    private final List<SearchableProduct> searchable;
    private final Map<Long, Product> byId;

    public Products(List<Product> products) {
        this.products = List.copyOf(Objects.requireNonNullElse(products, List.of()));
        this.searchable = this.products.stream()
                .map(SearchableProduct::of)
                .toList();
        this.byId = indexById(this.products);
    }

    private static Map<Long, Product> indexById(List<Product> products) {
        Map<Long, Product> indexed = new HashMap<>();

        for (Product product : products) {
            if (indexed.putIfAbsent(product.id(), product) != null) {
                throw new IllegalArgumentException("제품 ID가 중복됐습니다: " + product.id());
            }
        }

        return Map.copyOf(indexed);
    }

    public List<Product> search(String keyword) {
        SearchKeyword searchKeyword = new SearchKeyword(keyword);

        return searchable.stream()
                .map(product -> MatchedProduct.of(product, searchKeyword))
                .filter(MatchedProduct::isFound)
                .sorted(MatchedProduct.order())
                .map(MatchedProduct::product)
                .toList();
    }

    public long countContaining(Long ingredientId) {
        if (ingredientId == null) {
            return 0;
        }

        return products.stream()
                .filter(product -> product.contains(ingredientId))
                .count();
    }

    public ProductPage find(ProductFilter filter, ProductSort sort, int page, int size) {
        if (page < 0 || size < 1) {
            throw new IllegalArgumentException("페이지 조건이 올바르지 않습니다.");
        }

        List<Product> matched = matchedBy(filter);
        List<Product> sorted = matched.stream()
                .sorted(ProductSort.orDefault(sort).comparator())
                .toList();
        long offset = (long) page * size;
        List<Product> items = sorted.stream()
                .skip(offset)
                .limit(size)
                .toList();

        return new ProductPage(items, matched.size(), brandsOf(matched));
    }

    public long count(ProductFilter filter) {
        return matchedBy(filter).size();
    }

    public Optional<Product> findById(Long id) {
        return Optional.ofNullable(byId.get(id));
    }

    public List<Product> findAllById(List<Long> ids) {
        if (ids == null) {
            return List.of();
        }

        return ids.stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .toList();
    }

    private List<Product> matchedBy(ProductFilter filter) {
        List<Product> candidates = filter.hasKeyword() ? search(filter.keyword()) : products;

        return candidates.stream()
                .filter(product -> product.matches(filter))
                .toList();
    }

    private static List<Brand> brandsOf(List<Product> products) {
        return products.stream()
                .map(Product::brand)
                .distinct()
                .sorted(Comparator.comparing(Brand::koreanName).thenComparing(Brand::id))
                .toList();
    }

    public Map<Long, Long> countByCategoryId() {
        return products.stream()
                .collect(Collectors.toUnmodifiableMap(product -> product.category().id(), product -> 1L, Long::sum));
    }

    public Map<Long, Long> countByCategoryIdInBrand(Long brandId) {
        return products.stream()
                .filter(product -> Objects.equals(product.brand().id(), brandId))
                .collect(Collectors.toUnmodifiableMap(product -> product.category().id(), product -> 1L, Long::sum));
    }

    public Map<Long, Long> countByBrandId() {
        return products.stream()
                .collect(Collectors.toUnmodifiableMap(product -> product.brand().id(), product -> 1L, Long::sum));
    }
}
