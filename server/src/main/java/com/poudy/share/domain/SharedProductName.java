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
    private static final int MINIMUM_WORDS = 2;
    private static final int MINIMUM_LETTERS = 4;

    public SharedProductName {
        brand = Objects.requireNonNullElse(brand, Optional.empty());
        keyword = keyword == null ? "" : keyword.trim();
    }

    public static SharedProductName of(String productPhrase, Brands brands) {
        List<String> words = ShareWords.of(productPhrase);

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
