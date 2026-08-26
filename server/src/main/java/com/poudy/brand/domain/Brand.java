package com.poudy.brand.domain;

import com.poudy.search.domain.NameRank;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.search.domain.SearchableText;
import java.util.Objects;

public class Brand {

    private final Long id;
    private final String koreanName;
    private final String englishName;
    private final String imageUrl;
    private final SearchableText searchableKoreanName;
    private final SearchableText searchableEnglishName;

    public Brand(Long id, String koreanName, String englishName, String imageUrl) {
        this.id = id;
        this.koreanName = koreanName;
        this.englishName = englishName;
        this.imageUrl = imageUrl;
        this.searchableKoreanName = SearchableText.of(koreanName);
        this.searchableEnglishName = searchableEnglishNameOf(englishName);
    }

    public Long id() {
        return id;
    }

    public String koreanName() {
        return koreanName;
    }

    public String englishName() {
        return englishName;
    }

    public String imageUrl() {
        return imageUrl;
    }

    public boolean hasId(Long brandId) {
        return Objects.equals(id, brandId);
    }

    public boolean matchesNameExactly(SearchKeyword keyword) {
        return keyword.matchesExactly(koreanName, englishName);
    }

    public NameRank matchKeyword(SearchKeyword keyword) {
        NameRank koreanNameMatch = matchKoreanName(keyword);
        NameRank englishNameMatch = matchEnglishName(keyword);

        if (englishNameMatch.isBetterThan(koreanNameMatch)) {
            return englishNameMatch;
        }
        return koreanNameMatch;
    }

    public int compareOrderByName(Brand brand) {
        int nameComparison = koreanName.compareTo(brand.koreanName);
        if (nameComparison != 0) {
            return nameComparison;
        }
        return id.compareTo(brand.id);
    }

    @Override
    public boolean equals(Object object) {
        if (this == object) {
            return true;
        }
        if (!(object instanceof Brand brand)) {
            return false;
        }
        return Objects.equals(id, brand.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    private NameRank matchKoreanName(SearchKeyword keyword) {
        return NameRank.of(keyword, searchableKoreanName);
    }

    private NameRank matchEnglishName(SearchKeyword keyword) {
        if (searchableEnglishName == null) {
            return NameRank.NONE;
        }
        return NameRank.of(keyword, searchableEnglishName);
    }

    private static SearchableText searchableEnglishNameOf(String englishName) {
        if (englishName == null) {
            return null;
        }
        return SearchableText.of(englishName);
    }
}
