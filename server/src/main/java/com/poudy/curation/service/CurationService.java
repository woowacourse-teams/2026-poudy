package com.poudy.curation.service;

import com.poudy.curation.domain.Curation;
import com.poudy.curation.domain.CurationBlockContent;
import com.poudy.curation.domain.CurationBlockContent.ProductLink;
import com.poudy.curation.domain.ResolvedCurationDetail;
import com.poudy.curation.repository.CurationProductLinkRepository;
import com.poudy.curation.repository.CurationRepository;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.product.domain.Products;
import com.poudy.product.repository.ProductRepository;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CurationService {
    private static final Logger log = LoggerFactory.getLogger(CurationService.class);
    private final CurationRepository curationRepository;
    private final ProductRepository productRepository;
    private final CurationProductLinkRepository productLinkRepository;

    public CurationService(
        CurationRepository curationRepository,
        ProductRepository productRepository,
        CurationProductLinkRepository productLinkRepository
    ) {
        this.curationRepository = curationRepository;
        this.productRepository = productRepository;
        this.productLinkRepository = productLinkRepository;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public ResolvedCurationDetail findDetail(Long curationId) {
        Curation curation = curationRepository.findPublishedById(curationId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CURATION_NOT_FOUND));
        List<Long> productIds = curation.productIds();
        Products products = Products.from(productRepository.findAllById(productIds));
        logMissingProducts(curationId, productIds, products);
        return resolveProductLinks(ResolvedCurationDetail.from(curation, products));
    }

    private void logMissingProducts(Long curationId, List<Long> productIds, Products products) {
        for (Long productId : productIds) {
            if (products.findById(productId).isEmpty()) {
                log.warn("event=curation_missing_product curation_id={} product_id={}", curationId, productId);
            }
        }
    }

    private ResolvedCurationDetail resolveProductLinks(ResolvedCurationDetail detail) {
        List<CurationBlockContent> blocks = detail.blocks();
        List<ProductLink> links = blocks.stream().filter(ProductLink.class::isInstance)
            .map(ProductLink.class::cast).toList();
        if (links.isEmpty()) {
            return detail;
        }
        Set<UUID> invalidIds = productLinkRepository.findInvalidBlockIds(links);
        links.stream().filter(link -> invalidIds.contains(link.id()))
            .forEach(link -> logInvalidProductLink(detail.curation().id(), link));
        return new ResolvedCurationDetail(
            detail.curation(),
            blocks.stream().filter(block -> !invalidIds.contains(block.id())).toList()
        );
    }

    private void logInvalidProductLink(Long curationId, ProductLink link) {
        log.warn(
            "event=curation_invalid_product_link curation_id={} block_id={} brand_ids={} category_ids={} ingredient_ids={} group_codes={}",
            curationId,
            link.id(),
            link.query().brandIds(),
            link.query().categoryIds(),
            link.query().includeIngredientIds(),
            link.query().includeGroupCodes()
        );
    }
}
