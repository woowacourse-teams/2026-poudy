package com.poudy.product.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.excludecode.repository.ExcludeCodeRepository;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductPart;
import com.poudy.product.domain.ProductSimilarities;
import com.poudy.product.domain.SkinFilteredSimilarProduct;
import com.poudy.product.repository.ProductRepository;
import com.poudy.product.repository.ProductSimilarityRepository;
import com.poudy.skinfilter.repository.SkinFilterRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ProductSimilarityService {
    private final ProductRepository products;
    private final ProductSimilarityRepository similarities;
    private final ExcludeCodeRepository excludeCodes;
    private final SkinFilterRepository skinFilters;

    public ProductSimilarityService(
        ProductRepository products,
        ProductSimilarityRepository similarities,
        ExcludeCodeRepository excludeCodes,
        SkinFilterRepository skinFilters
    ) {
        this.products = products;
        this.similarities = similarities;
        this.excludeCodes = excludeCodes;
        this.skinFilters = skinFilters;
    }

    public ProductSimilarities find(Long productId, Long partId) {
        Product product = products.findById(productId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));
        ProductPart part = findPart(product, partId);
        if (part == null) {
            return new ProductSimilarities(product, null, false, List.of(), excludeCodes.findAll());
        }
        if (!similarities.hasResults(part.id())) {
            return new ProductSimilarities(product, part.id(), false, List.of(), excludeCodes.findAll());
        }
        return new ProductSimilarities(
            product,
            part.id(),
            true,
            similarities.findSimilarProducts(part.id()),
            excludeCodes.findAll()
        );
    }

    public List<SkinFilteredSimilarProduct> findSkinFiltered(long userId, Long productId, Long partId) {
        return find(productId, partId).filteredBy(skinFilters.findIngredientIds(userId));
    }

    private ProductPart findPart(Product product, Long partId) {
        if (partId == null) {
            return product.firstPart().orElse(null);
        }
        return product.findPart(partId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_PART_NOT_FOUND));
    }
}
