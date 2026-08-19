package com.poudy.share.domain;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.Brands;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.IntStream;

public record SharedProductName(Optional<Brand> brand, String keyword) {

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
            Optional<Brand> brand = brands.findByName(ShareWords.join(words.subList(0, size)));

            if (brand.isPresent()) {
                return new SharedProductName(brand, ShareWords.join(words.subList(size, words.size())));
            }
        }

        return new SharedProductName(Optional.empty(), productPhrase);
    }

    public boolean isEmpty() {
        return keyword.isEmpty();
    }

    public List<String> shortenedKeywords() {
        List<String> words = ShareWords.of(keyword);

        return IntStream.iterate(words.size() - 1, size -> size >= MINIMUM_WORDS, size -> size - 1)
                .mapToObj(size -> ShareWords.join(words.subList(0, size)))
                .filter(shortened -> shortened.replace(" ", "").length() >= MINIMUM_LETTERS)
                .toList();
    }
}
