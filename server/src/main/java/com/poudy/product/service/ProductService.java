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
import com.poudy.search.observation.ProductSearchObserver;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class ProductService {

    private static final Logger log = LoggerFactory.getLogger(ProductService.class);

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

        if (!query.hasKeyword() || page > 0) {
            return products.find(filter, sort, page, size, categories);
        }

        ProductSearchLogger.Context context = new ProductSearchLogger.Context(
            filter.keyword(),
            page,
            size,
            ProductSort.orDefault(sort),
            query.hasFilters()
        );
        return recordedSearch(context, () -> products.find(filter, sort, page, size, categories));
    }

    private ProductPage recordedSearch(ProductSearchLogger.Context context, Supplier<ProductPage> search) {
        long startedAt = System.nanoTime();
        ProductPage result = searchOrRecordFailure(context, search, startedAt);
        long elapsed = System.nanoTime() - startedAt;
        quietly(() -> searchLogger.completed(context, elapsed, result.totalElements()));
        quietly(() -> searchObserver.completed(context.keyword(), result.totalElements()));
        return result;
    }

    private ProductPage searchOrRecordFailure(
        ProductSearchLogger.Context context,
        Supplier<ProductPage> search,
        long startedAt
    ) {
        try {
            return search.get();
        } catch (RuntimeException exception) {
            long failedAfter = System.nanoTime() - startedAt;
            quietly(() -> searchLogger.failed(context, failedAfter));
            throw exception;
        }
    }

    private static void quietly(Runnable recording) {
        try {
            recording.run();
        } catch (RuntimeException exception) {
            log.warn("event=search_recording_failed");
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
            query.searchKeyword(),
            query.categoryIds(),
            query.brandIds(),
            query.moistureLevels().stream().map(MoistureLevel::new).toList(),
            query.oilLevels().stream().map(OilLevel::new).toList(),
            ingredientFilter,
            query.skinType()
        );
    }

}
