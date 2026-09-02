package com.poudy.brand.domain;

import com.poudy.search.domain.SearchKeyword;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

public class Brands {

    private final Map<Long, Brand> brandsById;

    private Brands(Map<Long, Brand> brandsById) {
        this.brandsById = brandsById;
    }

    public static Brands from(List<Brand> brands) {
        return new Brands(indexById(brands));
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

    private static Map<Long, Brand> indexById(List<Brand> brands) {
        if (brands == null) {
            return Map.of();
        }

        return Collections.unmodifiableMap(
            brands.stream()
                .collect(
                    Collectors.toMap(
                        Brand::id,
                        Function.identity(),
                        Brands::rejectDuplicateId,
                        LinkedHashMap::new
                    )
                )
        );
    }

    private static Brand rejectDuplicateId(Brand existingBrand, Brand duplicateBrand) {
        throw new IllegalArgumentException("브랜드 ID는 중복될 수 없습니다: " + duplicateBrand.id());
    }
}
