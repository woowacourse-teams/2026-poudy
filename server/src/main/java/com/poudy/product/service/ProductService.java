package com.poudy.product.service;

import com.poudy.category.repository.CategoryRepository;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.InvalidRequestException;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.excludecode.repository.ExcludeCodeRepository;
import com.poudy.ingredientgroup.repository.IngredientGroupRepository;
import com.poudy.myfilter.repository.MyFilterRepository;
import com.poudy.product.domain.ConflictingIngredientFilterException;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductDetail;
import com.poudy.product.domain.ProductPage;
import com.poudy.product.domain.ProductPart;
import com.poudy.product.domain.ProductQuery;
import com.poudy.product.domain.ProductSort;
import com.poudy.product.domain.ProductSuggestions;
import com.poudy.product.domain.RelatedKeywords;
import com.poudy.product.domain.UnsuitableIngredients;
import com.poudy.product.logging.ProductSearchLogger;
import com.poudy.product.repository.ProductAttributeRepository;
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

    private static final int RELATED_KEYWORD_LIMIT = 5;

    private static final Logger log = LoggerFactory.getLogger(ProductService.class);

    private final ProductRepository productRepository;
    private final ProductQueryRepository productQueries;
    private final CategoryRepository categoryRepository;
    private final ExcludeCodeRepository excludeCodeRepository;
    private final IngredientGroupRepository ingredientGroupRepository;
    private final MyFilterRepository myFilterRepository;
    private final ProductSearchLogger searchLogger;
    private final ProductAttributeRepository attributeRepository;

    public ProductService(
        ProductRepository productRepository,
        ProductQueryRepository productQueries,
        CategoryRepository categoryRepository,
        ExcludeCodeRepository excludeCodeRepository,
        IngredientGroupRepository ingredientGroupRepository,
        MyFilterRepository myFilterRepository,
        ProductSearchLogger searchLogger,
        ProductAttributeRepository attributeRepository
    ) {
        this.productRepository = productRepository;
        this.productQueries = productQueries;
        this.categoryRepository = categoryRepository;
        this.excludeCodeRepository = excludeCodeRepository;
        this.ingredientGroupRepository = ingredientGroupRepository;
        this.myFilterRepository = myFilterRepository;
        this.searchLogger = searchLogger;
        this.attributeRepository = attributeRepository;
    }

    public ProductPage findProducts(ProductQuery query, ProductSort sort, int page, int size, Long myFilterUserId) {
        return findProducts(applyMyFilter(query, myFilterUserId), sort, page, size);
    }

    public long countProducts(ProductQuery query, Long myFilterUserId) {
        return countProducts(applyMyFilter(query, myFilterUserId));
    }

    private ProductQuery applyMyFilter(ProductQuery query, Long userId) {
        if (userId == null) {
            return query;
        }
        return query.excludingMyFilterIngredients(myFilterRepository.findIngredientIds(userId));
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
        if (!attributeRepository.containsAll(query.attributes())
            || !ingredientGroupRepository.containsAll(query.groupCodes())) {
            throw new InvalidRequestException(ErrorCode.INVALID_QUERY_PARAMETER);
        }
        if (productQueries.hasConflictingIngredients(query)) {
            throw new ConflictingIngredientFilterException();
        }
    }

    public ProductSuggestions suggestProducts(String keyword, int page, int size) {
        return productQueries.suggest(keyword, page, size);
    }

    public RelatedKeywords relatedKeywords(String keyword) {
        return productQueries.relatedKeywords(keyword, RELATED_KEYWORD_LIMIT);
    }

    public boolean isWishlisted(long userId, long productId) {
        return productRepository.isWishlisted(userId, productId);
    }

    public boolean isShelved(long userId, long productId) {
        return productRepository.isShelved(userId, productId);
    }

    public UnsuitableIngredients findUnsuitableIngredients(long userId, long productId, Long partId) {
        Product product = findProduct(productId);
        return UnsuitableIngredients.of(selectPart(product, partId), myFilterRepository.findIngredientIds(userId));
    }

    public ProductDetail findDetail(Long productId, Long partId) {
        Product product = findProduct(productId);

        return ProductDetail.from(
            product,
            selectPart(product, partId),
            categoryRepository.findAll(),
            excludeCodeRepository.findAll(),
            ingredientGroupRepository.findBundlingGroups()
        );
    }

    private Product findProduct(Long productId) {
        return productRepository.findById(productId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));
    }

    private ProductPart selectPart(Product product, Long partId) {
        if (partId == null) {
            return product.firstPart().orElse(null);
        }

        return product.findPart(partId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_PART_NOT_FOUND));
    }

}
