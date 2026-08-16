package com.poudy.brand.domain;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

public class Brands {

    private final List<Brand> values;

    public Brands(List<Brand> values) {
        this.values = List.copyOf(Objects.requireNonNullElse(values, List.of()));
    }

    public List<Brand> sortedByName() {
        return values.stream()
                .sorted(Comparator.comparing(Brand::koreanName).thenComparing(Brand::id))
                .toList();
    }

    public Optional<Brand> findById(Long id) {
        return values.stream()
                .filter(brand -> brand.id().equals(id))
                .findFirst();
    }
}
