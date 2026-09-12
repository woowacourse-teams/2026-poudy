package com.poudy.productview.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.product.repository.ProductRepository;
import com.poudy.productview.domain.ProductViews;
import org.springframework.stereotype.Service;

@Service
public class ProductViewService {

    private final ProductRepository products;
    private final ProductViews views;

    public ProductViewService(ProductRepository products, ProductViews views) {
        this.products = products;
        this.views = views;
    }

    public void record(Long productId) {
        if (products.findAll().findById(productId).isEmpty()) {
            throw new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND);
        }
        views.record(productId);
    }
}
