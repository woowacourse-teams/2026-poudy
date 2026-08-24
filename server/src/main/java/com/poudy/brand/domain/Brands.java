package com.poudy.brand.domain;

import com.poudy.common.domain.SearchKeyword;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

public class Brands {

    private final List<Brand> values;
    private final Map<Long, Brand> byId;

    public Brands(List<Brand> values) {
        this.values = List.copyOf(Objects.requireNonNullElse(values, List.of()));
        this.byId = uniqueIndexOf(this.values);
    }

    public List<Brand> sortedByName() {
        return values.stream()
                .sorted(Brand::compareOrderByName)
                .toList();
    }

    public Optional<Brand> findById(Long id) {
        return Optional.ofNullable(byId.get(id));
    }

    public Optional<Brand> findByName(String name) {
        SearchKeyword keyword = new SearchKeyword(name);

        return values.stream()
                .filter(brand -> brand.matchesNameExactly(keyword))
                .findFirst();
    }

    private static Map<Long, Brand> uniqueIndexOf(List<Brand> values) {
        try {
            return values.stream().collect(Collectors.toUnmodifiableMap(Brand::id, Function.identity()));
        } catch (IllegalStateException exception) {
            throw new IllegalArgumentException("브랜드 ID는 중복될 수 없습니다.", exception);
        }
    }
}
