package com.poudy.brand.domain;

import com.poudy.common.domain.SearchKeyword;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

public class Brands {

    private final Map<Long, Brand> brandsById;

    public Brands(List<Brand> brands) {
        this.brandsById = uniqueIndexOf(Objects.requireNonNullElse(brands, List.of()));
    }

    public List<Brand> sortedByName() {
        return brandsById.values().stream()
                .sorted(Brand::compareOrderByName)
                .toList();
    }

    public Optional<Brand> findById(Long id) {
        return Optional.ofNullable(brandsById.get(id));
    }

    public Optional<Brand> findByName(String name) {
        SearchKeyword keyword = new SearchKeyword(name);

        return brandsById.values().stream()
                .filter(brand -> brand.matchesNameExactly(keyword))
                .findFirst();
    }

    private static Map<Long, Brand> uniqueIndexOf(List<Brand> brands) {
        Map<Long, Brand> brandsById = brands.stream()
                .collect(
                        Collectors.toMap(
                                Brand::id,
                                Function.identity(),
                                (existingBrand, duplicateBrand) -> existingBrand,
                                LinkedHashMap::new));
        if (brandsById.size() != brands.size()) {
            throw new IllegalArgumentException("브랜드 ID는 중복될 수 없습니다.");
        }
        return Collections.unmodifiableMap(brandsById);
    }
}
