package com.poudy.share.domain;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.Brands;
import com.poudy.common.domain.SearchKeyword;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.Products;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.IntStream;

public record SharedProductName(Optional<Brand> brand, String keyword) {

    private static final String UNKNOWN_BRAND = "미상";
    // 더 줄이면 남은 낱말이 제품을 가리키지 못한다.
    private static final int MINIMUM_WORDS = 2;
    private static final int MINIMUM_LETTERS = 4;

    public SharedProductName {
        brand = Objects.requireNonNullElse(brand, Optional.empty());
        keyword = keyword == null ? "" : keyword.trim();
    }

    public static SharedProductName of(String productPhrase, Brands brands) {
        List<String> words = ShareWords.of(productPhrase);

        // 브랜드 이름에 공백이 들어갈 수 있어 가장 긴 접두부터 맞춘다.
        for (int size = words.size(); size > 0; size--) {
            Optional<Brand> found = brands.findByName(ShareWords.join(words.subList(0, size)));

            if (found.isPresent()) {
                return new SharedProductName(found, ShareWords.join(words.subList(size, words.size())));
            }
        }

        return new SharedProductName(Optional.empty(), productPhrase);
    }

    public boolean isEmpty() {
        return keyword.isEmpty();
    }

    public String brandName() {
        return brand.map(Brand::koreanName).orElse(UNKNOWN_BRAND);
    }

    public ShareMatch matchIn(Products products) {
        Optional<Product> confirmed = confirm(candidatesIn(products, keyword), keyword);

        if (confirmed.isPresent()) {
            return ShareMatch.matched(confirmed.get());
        }

        // 낱말 하나만 덜어 내도 다른 제품 이름에 들어맞아 확정에는 쓰지 않는다. 넘길 검색어만 고른다.
        for (String shortened : shortenedKeywords()) {
            if (!candidatesIn(products, shortened).isEmpty()) {
                return ShareMatch.notFound(shortened);
            }
        }

        return ShareMatch.notFound(keyword);
    }

    public List<String> shortenedKeywords() {
        List<String> words = ShareWords.of(keyword);

        return IntStream.iterate(words.size() - 1, size -> size >= MINIMUM_WORDS, size -> size - 1)
                .mapToObj(size -> ShareWords.join(words.subList(0, size)))
                .filter(shortened -> ShareWords.letterCount(shortened) >= MINIMUM_LETTERS)
                .toList();
    }

    // 다른 브랜드의 비슷한 이름을 집으면 사용자가 알아채지 못한다.
    private List<Product> candidatesIn(Products products, String searched) {
        List<Product> found = products.search(searched);

        return brand.map(owner -> found.stream().filter(product -> product.hasBrand(owner)).toList())
                .orElse(found);
    }

    private static Optional<Product> confirm(List<Product> candidates, String searched) {
        SearchKeyword searchKeyword = new SearchKeyword(searched);
        List<Product> exact = candidates.stream()
                .filter(product -> product.hasExactName(searchKeyword))
                .toList();

        if (exact.size() == 1) {
            return Optional.of(exact.getFirst());
        }
        if (exact.isEmpty() && candidates.size() == 1) {
            return Optional.of(candidates.getFirst());
        }

        return Optional.empty();
    }
}
