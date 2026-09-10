package com.poudy.product.service;

import com.poudy.category.domain.Categories;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.product.domain.IngredientFilter;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductDetail;
import com.poudy.product.domain.ProductFilter;
import com.poudy.product.domain.ProductPage;
import com.poudy.product.domain.ProductSort;
import com.poudy.product.domain.ProductSuggestionPage;
import com.poudy.product.domain.Products;
import com.poudy.product.domain.sensory.MoistureLevel;
import com.poudy.product.domain.sensory.OilLevel;
import com.poudy.product.logging.ProductSearchLogger;
import com.poudy.product.repository.ProductRepository;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.search.observation.ProductSearchObserver;
import org.springframework.stereotype.Service;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final Categories categories;
    private final ExcludeCodeIngredients excludeCodeIngredients;
    private final ProductSearchLogger searchLogger;
    private final ProductSearchObserver searchObserver;

    public ProductService(
        ProductRepository productRepository,
        Categories categories,
        ExcludeCodeIngredients excludeCodeIngredients,
        ProductSearchLogger searchLogger,
        ProductSearchObserver searchObserver
    ) {
        this.productRepository = productRepository;
        this.categories = categories;
        this.excludeCodeIngredients = excludeCodeIngredients;
        this.searchLogger = searchLogger;
        this.searchObserver = searchObserver;
    }

    public ProductPage findProducts(
        ProductQuery query,
        ProductSort sort,
        int page,
        int size
    ) {
        ProductFilter filter = filterOf(query);
        Products products = products();

        if (query.keyword() == null || page > 0) {
            return products.find(filter, sort, page, size, categories);
        }

        // 정규화는 요청당 한 번만 한다. 검색·로그·수집이 같은 값을 나눠 쓴다.
        SearchKeyword keyword = filter.keyword();
        var context = new ProductSearchLogger.Context(
            keyword,
            page,
            size,
            ProductSort.orDefault(sort),
            query.hasFilters()
        );
        // 검색이 어떻게 끝났는지는 여기서 한 번만 가른다. 기록하는 쪽은 판정하지 않는다.
        long startedAt = System.nanoTime();
        ProductPage result;
        try {
            result = products.find(filter, sort, page, size, categories);
        } catch (RuntimeException exception) {
            long failedAfter = System.nanoTime() - startedAt;
            quietly(() -> searchLogger.failed(context, failedAfter));
            throw exception;
        }
        long elapsed = System.nanoTime() - startedAt;
        quietly(() -> searchLogger.completed(context, elapsed, result.totalElements()));
        quietly(() -> searchObserver.completed(keyword, result.totalElements()));
        return result;
    }

    /** 기록은 응답의 조건이 아니다. 로그든 집계든 실패해도 검색 결과는 그대로 나간다. */
    private static void quietly(Runnable recording) {
        try {
            recording.run();
        } catch (RuntimeException exception) {
            org.slf4j.LoggerFactory.getLogger(ProductService.class)
                .warn("event=search_recording_failed");
        }
    }

    public long countProducts(ProductQuery query) {
        return products().count(filterOf(query));
    }

    public ProductSuggestionPage suggestProducts(String keyword, int page, int size) {
        return products().suggest(keyword, page, size);
    }

    public ProductDetail findDetail(Long productId) {
        Product product = products().findById(productId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));

        return ProductDetail.from(product, categories, excludeCodeIngredients);
    }

    private Products products() {
        return productRepository.findAll();
    }

    private ProductFilter filterOf(ProductQuery query) {
        IngredientFilter ingredientFilter = IngredientFilter.of(
            query.includeIngredientIds(),
            query.excludeIngredientIds(),
            excludeCodeIngredients.idsOf(query.excludeCodes())
        );

        return new ProductFilter(
            query.keyword() == null ? null : new SearchKeyword(query.keyword()),
            query.categoryIds(),
            query.brandIds(),
            query.moistureLevels().stream().map(MoistureLevel::new).toList(),
            query.oilLevels().stream().map(OilLevel::new).toList(),
            ingredientFilter
        );
    }

}
