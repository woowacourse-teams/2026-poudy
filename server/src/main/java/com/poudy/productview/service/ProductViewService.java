package com.poudy.productview.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.product.repository.ProductRepository;
import com.poudy.productview.domain.ProductViews;
import org.springframework.stereotype.Service;

@Service
public class ProductViewService {

    private final ProductRepository productRepository;
    private final ProductViews productViews;

    public ProductViewService(ProductRepository productRepository, ProductViews productViews) {
        this.productRepository = productRepository;
        this.productViews = productViews;
    }

    public void increaseViewCount(Long productId) {
        if (productRepository.findAll().findById(productId).isEmpty()) {
            throw new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND);
        }
        productViews.increaseViewCount(productId);
    }
}
