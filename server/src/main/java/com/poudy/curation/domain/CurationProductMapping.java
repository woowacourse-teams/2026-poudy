package com.poudy.curation.domain;

import java.util.HashSet;
import java.util.List;
import java.util.UUID;

public record CurationProductMapping(Long productId, List<UUID> filterIds) {
    public CurationProductMapping {
        if (productId == null || productId <= 0) {
            throw new IllegalArgumentException("제품 ID는 양의 정수여야 합니다.");
        }
        filterIds = List.copyOf(filterIds);
        if (filterIds.isEmpty()) {
            throw new IllegalArgumentException("필터 기준 제품에는 필터 ID가 필요합니다.");
        }
        if (new HashSet<>(filterIds).size() != filterIds.size()) {
            throw new IllegalArgumentException("제품의 필터 ID가 중복됐습니다.");
        }
    }
}
