package com.poudy.storage.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.product.domain.Product;
import com.poudy.product.repository.ProductRepository;
import com.poudy.storage.repository.SavedProductRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StorageService {

    private final ProductRepository productRepository;
    private final SavedProductRepository savedProductRepository;

    public StorageService(ProductRepository productRepository, SavedProductRepository savedProductRepository) {
        this.productRepository = productRepository;
        this.savedProductRepository = savedProductRepository;
    }

    public List<Long> findSavedProductIds(long memberId) {
        return savedProductRepository.findProductIds(memberId);
    }

    public List<Product> findSavedProducts(long memberId) {
        return productRepository.findAllById(savedProductRepository.findProductIds(memberId));
    }

    @Transactional
    public void save(long memberId, long productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND);
        }
        savedProductRepository.save(memberId, productId);
    }

    @Transactional
    public void unsave(long memberId, long productId) {
        savedProductRepository.delete(memberId, productId);
    }
}
