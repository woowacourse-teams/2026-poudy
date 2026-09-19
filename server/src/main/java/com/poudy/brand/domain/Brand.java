package com.poudy.brand.domain;

import com.poudy.search.domain.NameRank;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.search.domain.SearchableText;
import com.poudy.search.domain.TextMatch;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PostLoad;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Stream;

@Entity
@Table(name = "brand")
public class Brand {

    @Id
    private Long id;

    @Column(name = "korean_name")
    private String koreanName;

    @Column(name = "english_name")
    private String englishName;

    @Column(name = "image_url")
    private String imageUrl;

    @Transient
    private List<SearchableText> searchableNames;

    protected Brand() {
    }

    public Brand(Long id, String koreanName, String englishName, String imageUrl) {
        this.id = id;
        this.koreanName = koreanName;
        this.englishName = englishName;
        this.imageUrl = imageUrl;
        this.searchableNames = searchableNamesOf(koreanName, englishName);
    }

    @PostLoad
    private void loadSearchableNames() {
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

    public Optional<TextMatch> findMatch(SearchKeyword keyword) {
        return TextMatch.best(searchableNames, keyword);
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
