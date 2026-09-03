package com.poudy.ingredient.domain;

import com.poudy.search.domain.NameRank;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.search.domain.SearchableText;
import com.poudy.search.domain.TextMatch;
import com.poudy.tag.domain.FormulationRole;
import com.poudy.tag.domain.SkinEffect;
import com.poudy.tag.domain.TagCategory;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

public final class Ingredient {

    private final Long id;
    private final String koreanName;
    private final String englishName;
    private final String originDefinition;
    private final String description;
    private final String descriptionEvidence;
    private final List<IngredientTag> tags;
    private final OffsetDateTime createdAt;
    private final OffsetDateTime updatedAt;
    private final List<SearchableText> searchableKoreanNames;
    private final List<SearchableText> searchableEnglishNames;
    private final List<SearchableText> searchableAliases;

    public Ingredient(
        Long id,
        String koreanName,
        String englishName,
        String originDefinition,
        String description,
        String descriptionEvidence,
        List<String> aliases,
        List<IngredientTag> tagMappings,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
    ) {
        this.id = id;
        this.koreanName = koreanName;
        this.englishName = Objects.requireNonNullElse(englishName, "");
        this.originDefinition = Objects.requireNonNullElse(originDefinition, "");
        this.description = description;
        this.descriptionEvidence = Objects.requireNonNullElse(descriptionEvidence, "");
        List<String> copiedAliases = List.copyOf(Objects.requireNonNullElse(aliases, List.of()));
        this.tags = List.copyOf(Objects.requireNonNullElse(tagMappings, List.of()));
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.searchableKoreanNames = SearchableText.formsOf(koreanName);
        this.searchableEnglishNames = SearchableText.formsOf(this.englishName);
        this.searchableAliases = copiedAliases.stream()
            .flatMap(alias -> SearchableText.formsOf(alias).stream())
            .toList();
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

    public String description() {
        return description;
    }

    public OffsetDateTime updatedAt() {
        return updatedAt;
    }

    public boolean hasKoreanName(String candidate) {
        return candidate.equals(koreanName);
    }

    public boolean hasId(Long ingredientId) {
        return Objects.equals(id, ingredientId);
    }

    public boolean hasEnglishName(String candidate) {
        return candidate.equalsIgnoreCase(englishName);
    }

    public List<FormulationRole> formulationRoles() {
        return tags.stream()
            .filter(tag -> tag.isOf(TagCategory.FUNCTION))
            .map(IngredientTag::formulationRole)
            .toList();
    }

    public List<SkinEffect> skinEffects() {
        return tags.stream()
            .filter(tag -> tag.isOf(TagCategory.BIOLOGICAL_EFFECT))
            .map(IngredientTag::skinEffect)
            .toList();
    }

    public List<String> infoSources() {
        return Evidence.ofDescription(descriptionEvidence).sources();
    }

    public List<String> effectSources() {
        return tags.stream()
            .filter(IngredientTag::isDisplayedSkinEffect)
            .flatMap(tag -> tag.sources().stream())
            .distinct()
            .toList();
    }

    public Optional<MatchedIngredient> match(SearchKeyword keyword) {
        NameRank nameRank = nameRank(keyword);
        Optional<IngredientTextMatch> nameMatch = findNameMatch(keyword);
        if (nameMatch.isPresent()) {
            return Optional.of(matched(nameMatch.get(), nameRank));
        }
        return findAliasMatch(keyword)
            .map(match -> matched(match, nameRank));
    }

    private Optional<IngredientTextMatch> findNameMatch(SearchKeyword keyword) {
        Optional<TextMatch> koreanNameMatch = TextMatch.best(searchableKoreanNames, keyword);
        Optional<TextMatch> englishNameMatch = TextMatch.best(searchableEnglishNames, keyword);

        if (isBetterThan(englishNameMatch, koreanNameMatch)) {
            return englishNameMatch.map(match -> new IngredientTextMatch(IngredientMatchField.ENGLISH_NAME, match));
        }
        return koreanNameMatch.map(match -> new IngredientTextMatch(IngredientMatchField.KOREAN_NAME, match));
    }

    private Optional<IngredientTextMatch> findAliasMatch(SearchKeyword keyword) {
        return TextMatch.best(searchableAliases, keyword)
            .map(match -> new IngredientTextMatch(IngredientMatchField.ALIAS, match));
    }

    private NameRank nameRank(SearchKeyword keyword) {
        NameRank koreanNameRank = NameRank.best(searchableKoreanNames, keyword);
        NameRank englishNameRank = NameRank.best(searchableEnglishNames, keyword);

        if (englishNameRank.isBetterThan(koreanNameRank)) {
            return englishNameRank;
        }
        return koreanNameRank;
    }

    private MatchedIngredient matched(IngredientTextMatch match, NameRank nameRank) {
        return new MatchedIngredient(this, match.field(), match.textMatch(), nameRank);
    }

    private static boolean isBetterThan(Optional<TextMatch> candidate, Optional<TextMatch> current) {
        if (candidate.isEmpty()) {
            return false;
        }
        return current.isEmpty() || candidate.get().rank().isBetterThan(current.get().rank());
    }
}
