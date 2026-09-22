package com.poudy.product.service;

import com.poudy.category.repository.CategoryRepository;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.excludecode.repository.ExcludeCodeRepository;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductDetail;
import com.poudy.product.domain.ProductFilter;
import com.poudy.product.domain.ProductPage;
import com.poudy.product.domain.ProductQuery;
import com.poudy.product.domain.ProductSort;
import com.poudy.product.domain.ProductSuggestionPage;
import com.poudy.product.domain.Products;
import com.poudy.product.logging.ProductSearchLogger;
import com.poudy.product.repository.ProductRepository;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class ProductService {

    private static final Logger log = LoggerFactory.getLogger(ProductService.class);

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ExcludeCodeRepository excludeCodeRepository;
    private final ProductSearchLogger searchLogger;

    public ProductService(
        ProductRepository productRepository,
        CategoryRepository categoryRepository,
        ExcludeCodeRepository excludeCodeRepository,
        ProductSearchLogger searchLogger
    ) {
        this.productRepository = productRepository;
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
        ProductFilter filter = query.toFilter(excludeCodeRepository.findAll());
        Products products = products();

        if (!query.hasKeyword() || page > 1) {
            return products.find(filter, sort, page, size, categoryRepository.findAll());
        }

        ProductSearchLogger.Context context = new ProductSearchLogger.Context(
            filter.keyword(),
            page,
            size,
            ProductSort.orDefault(sort),
            query.hasFilters()
        );
        return recordedSearch(context, () -> products.find(filter, sort, page, size, categoryRepository.findAll()));
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
        return products().count(query.toFilter(excludeCodeRepository.findAll()));
    }

    public ProductSuggestionPage suggestProducts(String keyword, int page, int size) {
        return products().suggest(keyword, page, size);
    }

    public ProductDetail findDetail(Long productId) {
        Product product = products().findById(productId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));

        return ProductDetail.from(product, categoryRepository.findAll(), excludeCodeRepository.findAll());
    }

    private Products products() {
        return productRepository.findAll();
    }

}
