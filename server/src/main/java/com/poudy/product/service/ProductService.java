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
import org.springframework.stereotype.Service;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final Categories categories;
    private final ExcludeCodeIngredients excludeCodeIngredients;
    private final ProductSearchLogger searchLogger;

    public ProductService(
        ProductRepository productRepository,
        Categories categories,
        ExcludeCodeIngredients excludeCodeIngredients,
        ProductSearchLogger searchLogger
    ) {
        this.productRepository = productRepository;
        this.categories = categories;
        this.excludeCodeIngredients = excludeCodeIngredients;
        this.searchLogger = searchLogger;
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

        return searchLogger.analyze(
            new ProductSearchLogger.Context(
                query.keyword(),
                page,
                size,
                ProductSort.orDefault(sort),
                query.hasFilters()
            ),
            () -> products.find(filter, sort, page, size, categories),
            ProductPage::totalElements
        );
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
            query.keyword(),
            query.categoryIds(),
            query.brandIds(),
            query.moistureLevels().stream().map(MoistureLevel::new).toList(),
            query.oilLevels().stream().map(OilLevel::new).toList(),
            ingredientFilter
        );
    }

}
