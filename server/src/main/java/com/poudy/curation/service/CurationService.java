package com.poudy.curation.service;

import com.poudy.curation.domain.Curation;
import com.poudy.curation.domain.ResolvedCurationDetail;
import com.poudy.curation.repository.CurationRepository;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.product.repository.ProductRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class CurationService {
    private final CurationRepository curationRepository;
    private final ProductRepository productRepository;

    public CurationService(CurationRepository curationRepository, ProductRepository productRepository) {
        this.curationRepository = curationRepository;
        this.productRepository = productRepository;
    }

    public List<Curation> findCurations() {
        return curationRepository.findAll().publishedBannersInOrder();
    }

    public ResolvedCurationDetail findDetail(Long curationId) {
        Curation curation = curationRepository.findAll().findPublishedDetailById(curationId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CURATION_NOT_FOUND));
        return ResolvedCurationDetail.from(curation, productRepository.findAll());
    }
}
