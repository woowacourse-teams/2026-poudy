package com.poudy.brand.domain;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

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
}
