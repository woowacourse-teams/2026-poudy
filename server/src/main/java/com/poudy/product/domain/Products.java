package com.poudy.product.domain;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.search.domain.SearchKeyword;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public final class Products {

    private final Map<Long, SearchableProduct> productsById;

    private Products(Map<Long, SearchableProduct> productsById) {
        this.productsById = productsById;
    }

    public static Products from(List<Product> products) {
        Map<Long, SearchableProduct> indexedProducts = new LinkedHashMap<>();
        for (Product product : Objects.requireNonNullElse(products, List.<Product>of())) {
            if (indexedProducts.putIfAbsent(product.id(), SearchableProduct.of(product)) != null) {
                throw new IllegalArgumentException("제품 ID가 중복됐습니다: " + product.id());
            }
        }

        return new Products(Collections.unmodifiableMap(indexedProducts));
    }

    public List<Product> search(String keyword) {
        return matched(new ProductSearchQuery(keyword)).stream()
            .map(MatchedProduct::product)
            .toList();
    }

    public List<Product> searchByProductName(String keyword) {
        SearchKeyword searchKeyword = new SearchKeyword(keyword);
        return productsById.values().stream()
            .map(product -> MatchedProduct.ofProductName(product, searchKeyword))
            .flatMap(Optional::stream)
            .sorted(MatchedProduct.order())
            .map(MatchedProduct::product)
            .toList();
    }

    public List<Product> findAllByBrand(Brand brand) {
        return values().stream()
            .filter(product -> product.hasBrand(brand))
            .toList();
    }

    private List<MatchedProduct> matched(ProductSearchQuery query) {
        return productsById.values().stream()
            .map(product -> product.match(query))
            .flatMap(Optional::stream)
            .sorted(MatchedProduct.order())
            .toList();
    }

    public long countContaining(Long ingredientId) {
        if (ingredientId == null) {
            return 0;
        }

        return values().stream()
            .filter(product -> product.contains(ingredientId))
            .count();
    }

    public ProductPage find(ProductFilter filter, ProductSort sort, int page, int size) {
        requireValidPageCondition(page, size);

        List<Product> matched = matchedBy(filter);
        List<Product> sorted = matched.stream()
            .sorted(ProductSort.orDefault(sort).comparator())
            .toList();

        return new ProductPage(pageOf(sorted, page, size), matched.size(), brandsOf(matched));
    }

    public ProductSuggestionPage suggest(String keyword, int page, int size) {
        requireValidPageCondition(page, size);

        List<MatchedProduct> found = matched(new ProductSearchQuery(keyword));

        return new ProductSuggestionPage(pageOf(found, page, size), found.size());
    }

    private static void requireValidPageCondition(int page, int size) {
        if (page < 0 || size < 1) {
            throw new IllegalArgumentException("페이지 조건이 올바르지 않습니다.");
        }
    }

    private static <T> List<T> pageOf(List<T> values, int page, int size) {
        return values.stream()
            .skip((long) page * size)
            .limit(size)
            .toList();
    }

    public long count(ProductFilter filter) {
        return matchedBy(filter).size();
    }

    public Optional<Product> findById(Long id) {
        return Optional.ofNullable(productsById.get(id))
            .map(SearchableProduct::product);
    }

    public List<Product> findAllById(List<Long> ids) {
        if (ids == null) {
            return List.of();
        }

        return ids.stream()
            .map(productsById::get)
            .filter(Objects::nonNull)
            .map(SearchableProduct::product)
            .toList();
    }

    private List<Product> matchedBy(ProductFilter filter) {
        return candidatesOf(filter).stream()
            .filter(filter::matches)
            .toList();
    }

    private List<Product> candidatesOf(ProductFilter filter) {
        if (filter.hasKeyword()) {
            return search(filter.keyword());
        }

        return values();
    }

    private static List<Brand> brandsOf(List<Product> products) {
        return products.stream()
            .map(Product::brand)
            .distinct()
            .sorted(Brand::compareOrderByName)
            .toList();
    }

    public List<CategoryProductCount> productCountsByCategory(Categories categories) {
        return countsByCategory(values()).categoriesOf(categories);
    }

    private ProductCountsByCategory countsByCategoryInBrand(Long brandId) {
        List<Product> productsInBrand = values().stream()
            .filter(product -> product.hasBrandId(brandId))
            .toList();

        return countsByCategory(productsInBrand);
    }

    public List<BrandProductCount> productCountsByBrand(List<Brand> brands) {
        return productCountsByBrandOf(values()).countsOf(brands);
    }

    public BrandProductCounts brandProductCountsOf(Brand brand, Categories categories) {
        return new BrandProductCounts(
            brand,
            countsByCategoryInBrand(brand.id()).nonEmptyCategoriesOf(categories)
        );
    }

    private static ProductCountsByCategory countsByCategory(List<Product> products) {
        Map<Long, Long> countsByCategoryId = products.stream()
            .flatMap(product -> categoryIdsOf(product.category()))
            .collect(Collectors.toUnmodifiableMap(categoryId -> categoryId, categoryId -> 1L, Long::sum));

        return new ProductCountsByCategory(countsByCategoryId);
    }

    private static Stream<Long> categoryIdsOf(Category category) {
        return Stream.of(category.id(), category.parentId())
            .filter(Objects::nonNull);
    }

    private static ProductCountsByBrand productCountsByBrandOf(List<Product> products) {
        Map<Long, Long> countsByBrandId = products.stream()
            .collect(Collectors.toUnmodifiableMap(product -> product.brand().id(), product -> 1L, Long::sum));
        return new ProductCountsByBrand(countsByBrandId);
    }

    private List<Product> values() {
        return productsById.values().stream()
            .map(SearchableProduct::product)
            .toList();
    }
}
