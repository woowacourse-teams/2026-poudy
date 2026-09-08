package com.poudy.curation.domain;

import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

public final class Curations {

    private final Map<Long, Curation> curations;

    private Curations(Map<Long, Curation> curations) {
        this.curations = curations;
    }

    public static Curations from(List<Curation> curations) {
        Map<Long, Curation> indexedCurations = new LinkedHashMap<>();
        for (Curation curation : Objects.requireNonNullElse(curations, List.<Curation>of())) {
            if (indexedCurations.putIfAbsent(curation.id(), curation) != null) {
                throw new IllegalArgumentException("큐레이션 ID가 중복됐습니다: " + curation.id());
            }
        }

        return new Curations(Collections.unmodifiableMap(indexedCurations));
    }

    public List<Curation> publishedSortedById() {
        return curations.values().stream()
            .filter(Curation::isPublished)
            .sorted(Comparator.comparing(Curation::id))
            .toList();
    }

    public Optional<Curation> findPublishedById(Long id) {
        return Optional.ofNullable(curations.get(id))
            .filter(Curation::isPublished);
    }
}
