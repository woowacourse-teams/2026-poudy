package com.poudy.product.service;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandProductCount;
import com.poudy.brand.domain.BrandProductCounter;
import com.poudy.brand.domain.BrandProductCounts;
import com.poudy.category.domain.Categories;
import com.poudy.category.domain.CategoryProductCount;
import com.poudy.category.domain.CategoryProductCounter;
import com.poudy.ingredient.domain.IngredientProduct;
import com.poudy.ingredient.domain.IngredientProducts;
import com.poudy.ingredient.domain.IngredientUsage;
import com.poudy.product.domain.ProductPage;
import com.poudy.product.domain.ProductQuery;
import com.poudy.product.domain.ProductSort;
import com.poudy.product.repository.ProductQueryRepository;
import com.poudy.product.repository.ProductRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ProductCountService implements BrandProductCounter, CategoryProductCounter, IngredientUsage {

    private final ProductRepository productRepository;
    private final ProductQueryRepository productQueries;

    public ProductCountService(ProductRepository productRepository, ProductQueryRepository productQueries) {
        this.productRepository = productRepository;
        this.productQueries = productQueries;
    }

    @Override
    public List<BrandProductCount> countByBrand(List<Brand> brands) {
        return productRepository.productCountsByBrand(brands);
    }

    @Override
    public BrandProductCounts countByCategory(Brand brand, Categories categories) {
        return productRepository.brandProductCountsOf(brand, categories);
    }

    @Override
    public List<CategoryProductCount> countByCategory(Categories categories) {
        return productRepository.productCountsByCategory(categories);
    }

    @Override
    public IngredientProducts productsContaining(Long ingredientId, int size) {
        if (size == 0) {
            return new IngredientProducts(productRepository.countContainingIngredient(ingredientId), List.of());
        }
        ProductQuery query = new ProductQuery(
            null,
            null,
            null,
            null,
            null,
            List.of(ingredientId),
            null,
            null,
            null,
            null,
            null,
            false,
            List.of()
        );
        ProductPage page = productQueries.find(query, ProductSort.DEFAULT, 1, size);
        return new IngredientProducts(
            page.totalElements(),
            page.items().stream()
                .map(
                    product -> new IngredientProduct(
                        product.id(),
                        product.name(),
                        product.brand(),
                        product.imageUrl(),
                        product.price(),
                        product.volumeValue(),
                        product.volumeUnit(),
                        product.moistureLevel(),
                        product.oilLevel()
                    )
                ).toList()
        );
    }
}
