package com.poudy.product.domain;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.search.domain.SearchKeyword;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.BiFunction;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class Products {

    private final List<Product> products;
    private final List<SearchableProduct> searchable;
    private final Map<Long, Product> byId;
    private final ProductCountsByBrand productCountsByBrand;

    public Products(List<Product> products) {
        this.products = List.copyOf(Objects.requireNonNullElse(products, List.of()));
        this.searchable = this.products.stream()
                .map(SearchableProduct::of)
                .toList();
        this.byId = indexById(this.products);
        this.productCountsByBrand = productCountsByBrandOf(this.products);
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
        return search(keyword, MatchedProduct::of);
    }

    public List<Product> searchByProductName(String keyword) {
        return search(keyword, MatchedProduct::ofProductName);
    }

    private List<Product> search(
            String keyword,
            BiFunction<SearchableProduct, SearchKeyword, MatchedProduct> match) {
        SearchKeyword searchKeyword = new SearchKeyword(keyword);

        return searchable.stream()
                .map(product -> match.apply(product, searchKeyword))
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
        requireValidPageCondition(page, size);

        List<Product> matched = matchedBy(filter);
        List<Product> sorted = matched.stream()
                .sorted(ProductSort.orDefault(sort).comparator())
                .toList();

        return new ProductPage(pageOf(sorted, page, size), matched.size(), brandsOf(matched));
    }

    public ProductSuggestionPage suggest(String keyword, int page, int size) {
        requireValidPageCondition(page, size);

        List<Product> found = search(keyword);

        return new ProductSuggestionPage(pageOf(found, page, size), found.size());
    }

    private static void requireValidPageCondition(int page, int size) {
        if (page < 0 || size < 1) {
            throw new IllegalArgumentException("페이지 조건이 올바르지 않습니다.");
        }
    }

    private static List<Product> pageOf(List<Product> values, int page, int size) {
        return values.stream()
                .skip((long) page * size)
                .limit(size)
                .toList();
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
        return candidatesOf(filter).stream()
                .filter(product -> product.matches(filter))
                .toList();
    }

    private List<Product> candidatesOf(ProductFilter filter) {
        if (filter.hasKeyword()) {
            return search(filter.keyword());
        }

        return products;
    }

    private static List<Brand> brandsOf(List<Product> products) {
        return products.stream()
                .map(Product::brand)
                .distinct()
                .sorted(Brand::compareOrderByName)
                .toList();
    }

    public List<CategoryProductCount> productCountsByCategory(Categories categories) {
        return countsByCategory(products).categoriesOf(categories);
    }

    private ProductCountsByCategory countsByCategoryInBrand(Long brandId) {
        List<Product> productsInBrand = products.stream()
                .filter(product -> product.hasBrandId(brandId))
                .toList();

        return countsByCategory(productsInBrand);
    }

    public List<BrandProductCount> productCountsByBrand(List<Brand> brands) {
        return productCountsByBrand.countsOf(brands);
    }

    public BrandProductCounts brandProductCountsOf(Brand brand, Categories categories) {
        return new BrandProductCounts(
                brand,
                countsByCategoryInBrand(brand.id()).nonEmptyCategoriesOf(categories));
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
}
