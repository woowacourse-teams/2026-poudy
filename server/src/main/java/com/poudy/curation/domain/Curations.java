package com.poudy.curation.domain;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public final class Curations {
    private final Map<Long, Curation> curations;

    private Curations(Map<Long, Curation> curations) {
        this.curations = curations;
    }

    public static Curations from(List<Curation> curations) {
        Map<Long, Curation> indexed = new LinkedHashMap<>();
        for (Curation curation : curations) {
            if (indexed.putIfAbsent(curation.id(), curation) != null) {
                throw new IllegalArgumentException("큐레이션 ID가 중복됐습니다: " + curation.id());
            }
        }
        return new Curations(Collections.unmodifiableMap(indexed));
    }

    public List<Curation> inOrder() {
        return List.copyOf(curations.values());
    }

    public Optional<Curation> findById(Long id) {
        return Optional.ofNullable(curations.get(id));
    }
}
