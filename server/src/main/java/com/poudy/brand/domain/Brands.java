package com.poudy.brand.domain;

import com.poudy.common.domain.NameMatch;
import com.poudy.common.domain.SearchKeyword;
import java.util.Comparator;
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
                .sorted(Comparator.comparing(Brand::koreanName).thenComparing(Brand::id))
                .toList();
    }

    public Optional<Brand> findById(Long id) {
        return Optional.ofNullable(byId.get(id));
    }

    /**
     * 이름이 정확히 같은 브랜드를 찾는다. 공유 텍스트에서 브랜드를 떼어 낼 때 쓰므로 부분 일치를 허용하지 않는다.
     */
    public Optional<Brand> findByName(String name) {
        SearchKeyword keyword = new SearchKeyword(name);

        return values.stream()
                .filter(brand -> matches(keyword, brand))
                .findFirst();
    }

    private static boolean matches(SearchKeyword keyword, Brand brand) {
        return keyword.match(brand.koreanName()) == NameMatch.EXACT
                || keyword.match(brand.englishName()) == NameMatch.EXACT;
    }

    private static Map<Long, Brand> uniqueIndexOf(List<Brand> values) {
        try {
            return values.stream().collect(Collectors.toUnmodifiableMap(Brand::id, Function.identity()));
        } catch (IllegalStateException exception) {
            throw new IllegalArgumentException("브랜드 ID는 중복될 수 없습니다.", exception);
        }
    }
}
