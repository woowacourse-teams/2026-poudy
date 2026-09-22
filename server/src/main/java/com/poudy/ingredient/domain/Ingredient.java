package com.poudy.ingredient.domain;

import com.poudy.search.domain.NameRank;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.search.domain.SearchableText;
import com.poudy.search.domain.TextMatch;
import com.poudy.tag.domain.FormulationRole;
import com.poudy.tag.domain.SkinEffect;
import com.poudy.tag.domain.Tag;
import com.poudy.tag.domain.TagCategory;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PostLoad;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Entity
@Table(name = "ingredient")
public class Ingredient {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    @Id
    private Long id;

    @Column(name = "korean_name")
    private String koreanName;

    @Column(name = "english_name")
    private String englishName;

    @Column(name = "description")
    private String description;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ElementCollection
    @CollectionTable(name = "ingredient_alias", joinColumns = @JoinColumn(name = "ingredient_id"))
    @OrderBy("id")
    private List<Alias> aliases;

    @ElementCollection
    @CollectionTable(name = "ingredient_source", joinColumns = @JoinColumn(name = "ingredient_id"))
    @OrderBy("id")
    private List<Source> sources;

    @ManyToMany
    @JoinTable(name = "ingredient_tag", joinColumns = @JoinColumn(name = "ingredient_id"), inverseJoinColumns = @JoinColumn(name = "tag_code"))
    @OrderColumn(name = "display_order")
    private List<Tag> tagReferences;

    @Transient
    private List<String> infoSources;

    @Transient
    private List<IngredientTag> tags;

    @Transient
    private List<SearchableText> searchableKoreanNames;

    @Transient
    private List<SearchableText> searchableEnglishNames;

    @Transient
    private List<SearchableText> searchableAliases;

    protected Ingredient() {
    }

    public Ingredient(
        Long id,
        String koreanName,
        String englishName,
        String description,
        List<String> infoSources,
        List<String> aliases,
        List<IngredientTag> tagMappings,
        OffsetDateTime updatedAt
    ) {
        this.id = id;
        this.koreanName = koreanName;
        this.englishName = englishName;
        this.description = description;
        this.updatedAt = local(updatedAt);
        this.aliases = Objects.requireNonNullElse(aliases, List.<String>of()).stream()
            .map(alias -> new Alias(null, alias))
            .toList();
        this.sources = Objects.requireNonNullElse(infoSources, List.<String>of()).stream()
            .map(content -> new Source(null, SourceType.INFO, content))
            .toList();
        this.tags = List.copyOf(Objects.requireNonNullElse(tagMappings, List.of()));
        index();
    }

    @PostLoad
    private void load() {
        List<String> effectSources = contentsOf(SourceType.EFFECT);
        this.tags = tagReferences.stream().map(tag -> new IngredientTag(tag, effectSources)).toList();
        index();
    }

    private void index() {
        this.infoSources = contentsOf(SourceType.INFO);
        this.searchableKoreanNames = SearchableText.formsOf(koreanName);
        this.searchableEnglishNames = SearchableText.formsOf(englishName());
        this.searchableAliases = aliases.stream()
            .flatMap(alias -> SearchableText.formsOf(alias.alias()).stream())
            .toList();
    }

    private List<String> contentsOf(SourceType type) {
        return sources.stream().filter(source -> source.type() == type).map(Source::content).toList();
    }

    private static LocalDateTime local(OffsetDateTime value) {
        if (value == null) {
            return null;
        }
        return value.atZoneSameInstant(SEOUL).toLocalDateTime();
    }

    public Long id() {
        return id;
    }

    public String koreanName() {
        return koreanName;
    }

    public String englishName() {
        return Objects.requireNonNullElse(englishName, "");
    }

    public String description() {
        return description;
    }

    public OffsetDateTime updatedAt() {
        if (updatedAt == null) {
            return null;
        }
        return updatedAt.atZone(SEOUL).toOffsetDateTime();
    }

    public boolean hasKoreanName(String candidate) {
        return candidate.equals(koreanName);
    }

    public boolean hasId(Long ingredientId) {
        return Objects.equals(id, ingredientId);
    }

    public boolean hasEnglishName(String candidate) {
        return candidate.equalsIgnoreCase(englishName());
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
        return infoSources;
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

    private enum SourceType {
        INFO,
        EFFECT
    }

    @Embeddable
    private record Alias(@Column(name = "id") Long id, @Column(name = "alias") String alias) {
    }

    @Embeddable
    private record Source(
        @Column(name = "id") Long id,
        @Enumerated(EnumType.STRING) @Column(name = "type") SourceType type,
        @Column(name = "content") String content) {
    }
}
