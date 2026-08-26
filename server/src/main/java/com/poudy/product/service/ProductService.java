package com.poudy.product.service;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandDetail;
import com.poudy.brand.domain.Brands;
import com.poudy.category.domain.Categories;
import com.poudy.common.dto.PaginationRequest;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.product.controller.dto.ProductFilterRequest;
import com.poudy.product.controller.dto.ProductSortRequest;
import com.poudy.product.domain.IngredientFilter;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductCountsByCategory;
import com.poudy.product.domain.ProductDetail;
import com.poudy.product.domain.ProductFilter;
import com.poudy.product.domain.ProductPage;
import com.poudy.product.domain.ProductSuggestionPage;
import com.poudy.product.domain.Products;
import com.poudy.product.domain.sensory.MoistureLevel;
import com.poudy.product.domain.sensory.OilLevel;
import com.poudy.product.repository.ProductRepository;
import org.springframework.stereotype.Service;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final Brands brands;
    private final Categories categories;
    private final ExcludeCodeIngredients excludeCodeIngredients;

    public ProductService(
            ProductRepository productRepository,
            Brands brands,
            Categories categories,
            ExcludeCodeIngredients excludeCodeIngredients) {
        this.productRepository = productRepository;
        this.brands = brands;
        this.categories = categories;
        this.excludeCodeIngredients = excludeCodeIngredients;
    }

    public ProductPage findProducts(
            ProductFilterRequest request,
            ProductSortRequest sort,
            PaginationRequest pagination) {
        return products().find(
                filterOf(request),
                sort.sort(),
                pagination.page(),
                pagination.size());
    }

    public long countProducts(ProductFilterRequest request) {
        return products().count(filterOf(request));
    }

    public ProductSuggestionPage suggestProducts(String keyword, PaginationRequest pagination) {
        return products().suggest(keyword, pagination.page(), pagination.size());
    }

    public ProductCountsByCategory countsByCategory() {
        return products().countsByCategory();
    }

    public BrandDetail findBrandDetail(Long brandId) {
        Brand brand = brands.findById(brandId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.BRAND_NOT_FOUND));

        return products().brandDetailOf(brand, categories);
    }

    public ProductDetail findDetail(Long productId) {
        Product product = products().findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));

        return new ProductDetail(
                product,
                categories.pathOf(product.category()),
                excludeCodeIngredients.freeCodesOf(product.ingredients()));
    }

    private Products products() {
        return productRepository.findAll();
    }

    private ProductFilter filterOf(ProductFilterRequest request) {
        IngredientFilter ingredientFilter = IngredientFilter.of(
                request.includeIngredientIds(),
                request.excludeIngredientIds(),
                excludeCodeIngredients.idsOf(request.excludeCodes()));

        return new ProductFilter(
                request.keyword(),
                request.categoryIds(),
                request.brandIds(),
                request.moistureLevel().stream().map(MoistureLevel::new).toList(),
                request.oilLevel().stream().map(OilLevel::new).toList(),
                ingredientFilter);
    }
}
