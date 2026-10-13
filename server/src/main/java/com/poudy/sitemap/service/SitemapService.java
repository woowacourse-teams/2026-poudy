package com.poudy.sitemap.service;

import com.poudy.sitemap.domain.ContentUpdates;
import com.poudy.sitemap.repository.SitemapRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class SitemapService {

    private final SitemapRepository sitemapRepository;

    public SitemapService(SitemapRepository sitemapRepository) {
        this.sitemapRepository = sitemapRepository;
    }

    public ContentUpdates findContentUpdates() {
        return new ContentUpdates(
            sitemapRepository.findCategoryUpdates(),
            sitemapRepository.findBrandUpdates(),
            sitemapRepository.findPublishedCurationUpdates(),
            sitemapRepository.findUsedIngredientUpdates()
        );
    }
}
