package com.poudy.curation.service;

import com.poudy.curation.domain.Curation;
import com.poudy.curation.repository.CurationRepository;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.product.domain.Product;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class CurationService {

    private final CurationRepository curationRepository;

    public CurationService(CurationRepository curationRepository) {
        this.curationRepository = curationRepository;
    }

    public List<Curation> findCurations() {
        return curationRepository.findAll().publishedSortedById();
    }

    public Curation findDetail(Long curationId) {
        return findPublished(curationId);
    }

    public List<Product> findProducts(Long curationId, Long categoryId) {
        return findPublished(curationId).products(categoryId);
    }

    private Curation findPublished(Long curationId) {
        return curationRepository.findAll().findPublishedById(curationId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CURATION_NOT_FOUND));
    }
}
