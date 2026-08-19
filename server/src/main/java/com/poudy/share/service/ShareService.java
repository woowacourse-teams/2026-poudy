package com.poudy.share.service;

import com.poudy.brand.domain.Brands;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.InvalidRequestException;
import com.poudy.product.repository.ProductRepository;
import com.poudy.share.domain.ShareMatch;
import com.poudy.share.domain.ShareText;
import com.poudy.share.domain.SharedProductName;
import com.poudy.share.domain.SharedProductNames;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class ShareService {

    private static final Logger log = LoggerFactory.getLogger(ShareService.class);

    private final ProductRepository productRepository;
    private final Brands brands;

    public ShareService(ProductRepository productRepository, Brands brands) {
        this.productRepository = productRepository;
        this.brands = brands;
    }

    public ShareMatch match(String text) {
        ShareText shareText = new ShareText(text);

        if (!shareText.hasLink()) {
            throw new InvalidRequestException(ErrorCode.INVALID_QUERY_PARAMETER);
        }

        SharedProductNames names = SharedProductNames.of(shareText, brands);

        if (names.isEmpty()) {
            throw new InvalidRequestException(ErrorCode.INVALID_QUERY_PARAMETER);
        }

        ShareMatch match = names.matchIn(productRepository.findAll());

        if (match.isNotFound()) {
            logUnmatched(names.narrowest());
        }

        return match;
    }

    // 제품 등록 우선순위 판단에 쓴다. 원문은 공유 링크를 품고 있어 정제한 이름만 남긴다.
    private static void logUnmatched(SharedProductName name) {
        log.info("공유 텍스트로 제품을 찾지 못했습니다. brand={}, keyword={}", name.brandName(), name.keyword());
    }
}
