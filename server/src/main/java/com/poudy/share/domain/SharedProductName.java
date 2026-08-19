package com.poudy.share.domain;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.Brands;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.IntStream;

/**
 * 공유 텍스트에서 뽑아낸 브랜드와 제품명. 카탈로그의 제품명에는 브랜드가 들어 있지 않아 둘을 갈라 둔다.
 *
 * @param brand   카탈로그에서 찾은 브랜드. 취급하지 않는 브랜드면 비어 있다
 * @param keyword 브랜드를 뗀 제품명
 */
public record SharedProductName(Optional<Brand> brand, String keyword) {

    // 축약 재검색 하한. 이보다 더 줄이면 남은 낱말이 제품을 가리키지 못하고 엉뚱한 제품을 집는다.
    private static final int MINIMUM_WORDS = 2;
    private static final int MINIMUM_LETTERS = 4;

    public SharedProductName {
        brand = Objects.requireNonNullElse(brand, Optional.empty());
        keyword = keyword == null ? "" : keyword.trim();
    }

    public static SharedProductName of(String productPhrase, Brands brands) {
        List<String> words = ShareWords.of(productPhrase);

        // 브랜드 이름에 공백이 들어갈 수 있어 앞에서부터 가장 긴 접두를 먼저 맞춘다.
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

    /**
     * 뒤 낱말부터 하나씩 덜어 낸 검색어를 넓은 순서대로 준다. 기획명이 제품명 뒤에 붙어 온 공유를 구제한다.
     */
    public List<String> shortenedKeywords() {
        List<String> words = ShareWords.of(keyword);

        return IntStream.iterate(words.size() - 1, size -> size >= MINIMUM_WORDS, size -> size - 1)
                .mapToObj(size -> ShareWords.join(words.subList(0, size)))
                .filter(shortened -> shortened.replace(" ", "").length() >= MINIMUM_LETTERS)
                .toList();
    }
}
