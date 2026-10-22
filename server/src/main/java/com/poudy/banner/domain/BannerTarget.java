package com.poudy.banner.domain;

import com.poudy.curation.domain.CurationProductLinkQuery;
import java.net.URI;
import java.util.Objects;
import java.util.Set;

public sealed interface BannerTarget {
    boolean isAvailable(Set<Long> publishedCurations, Set<CurationProductLinkQuery> invalidQueries);

    final class Curation implements BannerTarget {
        private final long curationId;

        public Curation(long curationId) {
            if (curationId <= 0) {
                throw new IllegalArgumentException("큐레이션 ID는 양수여야 합니다.");
            }
            this.curationId = curationId;
        }

        public long curationId() {
            return curationId;
        }

        @Override
        public boolean isAvailable(Set<Long> publishedCurations, Set<CurationProductLinkQuery> invalidQueries) {
            return publishedCurations.contains(curationId);
        }
    }

    final class ProductList implements BannerTarget {
        private final CurationProductLinkQuery query;

        public ProductList(CurationProductLinkQuery query) {
            this.query = Objects.requireNonNull(query);
        }

        public CurationProductLinkQuery query() {
            return query;
        }

        @Override
        public boolean isAvailable(Set<Long> publishedCurations, Set<CurationProductLinkQuery> invalidQueries) {
            return !invalidQueries.contains(query);
        }
    }

    final class External implements BannerTarget {
        private final String url;

        public External(String url) {
            URI uri = URI.create(url);
            if (!("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                || uri.getHost() == null || uri.getRawUserInfo() != null) {
                throw new IllegalArgumentException("외부 배너 URL은 절대 HTTP(S) 주소여야 합니다.");
            }
            this.url = url;
        }

        public String url() {
            return url;
        }

        @Override
        public boolean isAvailable(Set<Long> publishedCurations, Set<CurationProductLinkQuery> invalidQueries) {
            return true;
        }
    }
}
