package com.poudy.storage.service;

import com.poudy.product.domain.Product;
import com.poudy.product.repository.ProductRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class StorageService {

    private final ProductRepository productRepository;

    public StorageService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public List<Product> findProducts(List<Long> productIds) {
        return productRepository.findAll().findAllById(productIds);
    }
}
