package com.poudy.brand.domain;

import com.poudy.search.domain.NameRank;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.search.domain.SearchableText;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

public class Brand {

    private final Long id;
    private final String koreanName;
    private final String englishName;
    private final String imageUrl;
    private final List<SearchableText> searchableNames;

    public Brand(Long id, String koreanName, String englishName, String imageUrl) {
        this.id = id;
        this.koreanName = koreanName;
        this.englishName = englishName;
        this.imageUrl = imageUrl;
        this.searchableNames = searchableNamesOf(koreanName, englishName);
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
        return NameRank.best(searchableNames, keyword);
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

    private static List<SearchableText> searchableNamesOf(String koreanName, String englishName) {
        return Stream.of(koreanName, englishName)
                .filter(Objects::nonNull)
                .flatMap(name -> SearchableText.formsOf(name).stream())
                .toList();
    }
}
