package com.poudy.product.service;

import com.poudy.category.repository.CategoryRepository;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.InvalidRequestException;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.excludecode.repository.ExcludeCodeRepository;
import com.poudy.product.domain.ConflictingIngredientFilterException;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductDetail;
import com.poudy.product.domain.ProductPage;
import com.poudy.product.domain.ProductQuery;
import com.poudy.product.domain.ProductSort;
import com.poudy.product.domain.ProductSuggestions;
import com.poudy.product.logging.ProductSearchLogger;
import com.poudy.product.repository.ProductQueryRepository;
import com.poudy.product.repository.ProductRepository;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ProductService {

    private static final Logger log = LoggerFactory.getLogger(ProductService.class);

    private final ProductRepository productRepository;
    private final ProductQueryRepository productQueries;
    private final CategoryRepository categoryRepository;
    private final ExcludeCodeRepository excludeCodeRepository;
    private final ProductSearchLogger searchLogger;

    public ProductService(
        ProductRepository productRepository,
        ProductQueryRepository productQueries,
        CategoryRepository categoryRepository,
        ExcludeCodeRepository excludeCodeRepository,
        ProductSearchLogger searchLogger
    ) {
        this.productRepository = productRepository;
        this.productQueries = productQueries;
        this.categoryRepository = categoryRepository;
        this.excludeCodeRepository = excludeCodeRepository;
        this.searchLogger = searchLogger;
    }

    public ProductPage findProducts(
        ProductQuery query,
        ProductSort sort,
        int page,
        int size
    ) {
        validate(query);
        if (!query.hasKeyword() || page > 1) {
            return productQueries.find(query, sort, page, size);
        }

        ProductSearchLogger.Context context = new ProductSearchLogger.Context(
            query.searchKeyword(),
            page,
            size,
            ProductSort.orDefault(sort),
            query.hasFilters()
        );
        return recordedSearch(context, () -> productQueries.find(query, sort, page, size));
    }

    private ProductPage recordedSearch(ProductSearchLogger.Context context, Supplier<ProductPage> search) {
        long startedAt = System.nanoTime();
        ProductPage result = searchOrRecordFailure(context, search, startedAt);
        long elapsed = System.nanoTime() - startedAt;
        quietly(() -> searchLogger.completed(context, elapsed, result.totalElements()));
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
        validate(query);
        return productQueries.count(query);
    }

    private void validate(ProductQuery query) {
        if (!excludeCodeRepository.containsAll(query.excludeCodes())) {
            throw new InvalidRequestException(ErrorCode.INVALID_QUERY_PARAMETER);
        }
        if (productQueries.hasConflictingIngredients(query)) {
            throw new ConflictingIngredientFilterException();
        }
    }

    public ProductSuggestions suggestProducts(String keyword, int page, int size) {
        return productQueries.suggest(keyword, page, size);
    }

    public ProductDetail findDetail(Long productId) {
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));

        return ProductDetail.from(product, categoryRepository.findAll(), excludeCodeRepository.findAll());
    }

}
