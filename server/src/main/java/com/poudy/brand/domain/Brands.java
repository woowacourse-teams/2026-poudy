package com.poudy.brand.domain;

import com.poudy.common.domain.SearchKeyword;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

public class Brands {

    private final Map<Long, Brand> brandsById;

    public Brands(List<Brand> brands) {
        this.brandsById = parseBrandsById(brands);
    }

    public List<Brand> sortedByName() {
        return brandsById.values().stream()
                .sorted(Brand::compareOrderByName)
                .toList();
    }

    public List<BrandSummary> summariesWith(BrandCounts brandCounts) {
        return sortedByName().stream()
                .map(brand -> new BrandSummary(brand, brandCounts.countOf(brand.id())))
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

    private static Map<Long, Brand> parseBrandsById(List<Brand> brands) {
        if (brands == null) {
            return Map.of();
        }

        return brands.stream()
                .collect(
                        Collectors.toMap(
                                Brand::id,
                                Function.identity(),
                                Brands::rejectDuplicateId,
                                LinkedHashMap::new));
    }

    private static Brand rejectDuplicateId(Brand existingBrand, Brand duplicateBrand) {
        throw new IllegalArgumentException("브랜드 ID는 중복될 수 없습니다: " + duplicateBrand.id());
    }
}
