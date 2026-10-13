package com.poudy.curation.service;

import com.poudy.curation.domain.Curation;
import com.poudy.curation.domain.ResolvedCurationDetail;
import com.poudy.curation.repository.CurationRepository;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.product.domain.Products;
import com.poudy.product.repository.ProductRepository;
import java.util.List;
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

    public CurationService(CurationRepository curationRepository, ProductRepository productRepository) {
        this.curationRepository = curationRepository;
        this.productRepository = productRepository;
    }

    public List<Curation> findCurations() {
        return curationRepository.findAll().visibleBannersInOrder();
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public ResolvedCurationDetail findDetail(Long curationId) {
        Curation curation = curationRepository.findPublishedById(curationId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CURATION_NOT_FOUND));
        Products products = Products.from(productRepository.findAllById(curation.productIds()));
        for (Long productId : curation.productIds()) {
            if (products.findById(productId).isEmpty()) {
                log.warn("event=curation_missing_product curation_id={} product_id={}", curationId, productId);
            }
        }
        return ResolvedCurationDetail.from(curation, products);
    }
}
