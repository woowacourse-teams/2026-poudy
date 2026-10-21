package com.poudy.wishlist.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.product.domain.Product;
import com.poudy.product.repository.ProductRepository;
import com.poudy.wishlist.repository.WishlistProductRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WishlistService {

    private final ProductRepository productRepository;
    private final WishlistProductRepository wishlistProductRepository;

    public WishlistService(ProductRepository productRepository, WishlistProductRepository wishlistProductRepository) {
        this.productRepository = productRepository;
        this.wishlistProductRepository = wishlistProductRepository;
    }

    public List<Product> findWishlist(long userId) {
        return productRepository.findAllById(wishlistProductRepository.findProductIds(userId));
    }

    @Transactional
    public void add(long userId, long productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND);
        }
        wishlistProductRepository.save(userId, productId);
    }

    @Transactional
    public void remove(long userId, long productId) {
        wishlistProductRepository.delete(userId, productId);
    }

    @Transactional
    public void restore(long userId, long productId) {
        if (wishlistProductRepository.restore(userId, productId)) {
            return;
        }
        if (!wishlistProductRepository.contains(userId, productId)) {
            throw new ResourceNotFoundException(ErrorCode.WISHLIST_PRODUCT_NOT_FOUND);
        }
    }
}
