package com.poudy.banner.service;

import com.poudy.banner.domain.Banner;
import com.poudy.banner.domain.BannerSlot;
import com.poudy.banner.domain.BannerTarget;
import com.poudy.banner.repository.BannerRepository;
import com.poudy.curation.domain.CurationProductLinkQuery;
import com.poudy.curation.repository.CurationProductLinkRepository;
import com.poudy.curation.repository.CurationRepository;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BannerService {
    private static final Logger log = LoggerFactory.getLogger(BannerService.class);
    private final BannerRepository banners;
    private final CurationRepository curations;
    private final CurationProductLinkRepository productLinks;

    public BannerService(
        BannerRepository banners,
        CurationRepository curations,
        CurationProductLinkRepository productLinks
    ) {
        this.banners = banners;
        this.curations = curations;
        this.productLinks = productLinks;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public List<Banner> findBanners(BannerSlot slot) {
        List<Banner> candidates = banners.findVisible(slot);
        List<Long> curationIds = candidates.stream().map(Banner::target)
            .filter(BannerTarget.Curation.class::isInstance).map(BannerTarget.Curation.class::cast)
            .map(BannerTarget.Curation::curationId).toList();
        List<CurationProductLinkQuery> queries = candidates.stream().map(Banner::target)
            .filter(BannerTarget.ProductList.class::isInstance).map(BannerTarget.ProductList.class::cast)
            .map(BannerTarget.ProductList::query).toList();
        Set<Long> publishedIds = curations.findPublishedIds(curationIds);
        Set<CurationProductLinkQuery> invalidQueries = productLinks.findInvalidQueries(queries);
        return candidates.stream().filter(banner -> {
            boolean available = banner.isAvailable(publishedIds, invalidQueries);
            if (!available) {
                log.warn("event=banner_unavailable_target banner_id={} slot={}", banner.id(), slot);
            }
            return available;
        }).toList();
    }
}
