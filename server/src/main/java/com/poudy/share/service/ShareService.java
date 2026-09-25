package com.poudy.share.service;

import com.poudy.brand.repository.BrandRepository;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.InvalidRequestException;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductNameMatch;
import com.poudy.product.repository.ProductRepository;
import com.poudy.share.domain.ShareMatch;
import com.poudy.share.domain.ShareText;
import com.poudy.share.domain.SharedProductLookup;
import com.poudy.share.domain.SharedProductName;
import com.poudy.share.domain.SharedProductNames;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ShareService {

    private static final Logger log = LoggerFactory.getLogger(ShareService.class);

    private final ProductRepository productRepository;
    private final BrandRepository brandRepository;

    public ShareService(ProductRepository productRepository, BrandRepository brandRepository) {
        this.productRepository = productRepository;
        this.brandRepository = brandRepository;
    }

    public ShareMatch match(String text) {
        ShareText shareText = new ShareText(text);

        if (!shareText.hasLink()) {
            throw new InvalidRequestException(ErrorCode.INVALID_QUERY_PARAMETER);
        }

        SharedProductNames names = SharedProductNames.of(shareText, brandRepository.findAll());

        if (names.isEmpty()) {
            throw new InvalidRequestException(ErrorCode.INVALID_QUERY_PARAMETER);
        }

        ShareMatch match = names.matchIn(new SharedProductLookup() {
            @Override
            public List<ProductNameMatch> findByName(String keyword, Long brandId) {
                return productRepository.findByProductName(keyword, brandId);
            }

            @Override
            public List<Product> findByBrand(Long brandId) {
                return productRepository.findByBrand(brandId);
            }

        });

        if (match.isNotFound()) {
            logUnmatched(names.narrowest());
        }

        return match;
    }

    private static void logUnmatched(SharedProductName name) {
        log.info("공유 텍스트로 제품을 찾지 못했습니다. brand={}, keyword={}", name.brandName(), name.keyword());
    }
}
