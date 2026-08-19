package com.poudy.share.service;

import com.poudy.brand.domain.Brands;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.InvalidRequestException;
import com.poudy.product.repository.ProductRepository;
import com.poudy.share.domain.ShareMatch;
import com.poudy.share.domain.ShareText;
import com.poudy.share.domain.SharedProductName;
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

        SharedProductName name = SharedProductName.of(shareText.productPhrase(), brands);

        if (name.isEmpty()) {
            throw new InvalidRequestException(ErrorCode.INVALID_QUERY_PARAMETER);
        }

        ShareMatch match = ShareMatch.of(name, productRepository.findAll());

        if (match.isNotFound()) {
            logUnmatched(name);
        }

        return match;
    }

    /**
     * 어떤 제품을 먼저 등록해야 하는지 판단할 근거로 남긴다. 원문은 공유 링크를 품고 있어 정제한 이름만 남긴다.
     */
    private static void logUnmatched(SharedProductName name) {
        log.info(
                "공유 텍스트로 제품을 찾지 못했습니다. brand={}, keyword={}",
                name.brand().map(brand -> brand.koreanName()).orElse("미상"),
                name.keyword());
    }
}
