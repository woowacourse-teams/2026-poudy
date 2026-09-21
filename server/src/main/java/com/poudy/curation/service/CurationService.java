package com.poudy.curation.service;

import com.poudy.curation.domain.Curation;
import com.poudy.curation.domain.CurationDetail;
import com.poudy.curation.repository.CurationRepository;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.product.domain.Products;
import com.poudy.product.repository.ProductRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class CurationService {
    private final CurationRepository curationRepository;
    private final ProductRepository productRepository;

    public CurationService(CurationRepository curationRepository, ProductRepository productRepository) {
        this.curationRepository = curationRepository;
        this.productRepository = productRepository;
    }

    public List<Curation> findCurations() {
        return curationRepository.findAll().inOrder();
    }

    public CurationDetail findDetail(Long curationId) {
        Curation curation = curationRepository.findById(curationId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CURATION_NOT_FOUND));
        return CurationDetail.from(curation, Products.from(productRepository.findAllById(curation.productIds())));
    }
}
