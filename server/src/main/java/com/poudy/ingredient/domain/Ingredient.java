package com.poudy.ingredient.domain;

import com.poudy.tag.domain.FormulationRole;
import com.poudy.tag.domain.SkinEffect;
import com.poudy.tag.domain.TagCategory;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;

public final class Ingredient {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final Long id;
    private final String koreanName;
    private final String englishName;
    private final String description;
    private final LocalDateTime updatedAt;
    private final List<String> aliases;
    private final List<String> infoSources;
    private final List<IngredientTag> tags;

    public static Ingredient create(
        Long id,
        String koreanName,
        String englishName,
        String description,
        List<String> infoSources,
        List<String> aliases,
        List<IngredientTag> tagMappings,
        OffsetDateTime updatedAt
    ) {
        List<String> normalizedSources = Objects.requireNonNullElse(infoSources, List.<String>of()).stream()
            .map(source -> referenceOf(id, source)).distinct().toList();
        return new Ingredient(
            id,
            koreanName,
            englishName,
            description,
            normalizedSources,
            List.copyOf(Objects.requireNonNullElse(aliases, List.of())),
            List.copyOf(Objects.requireNonNullElse(tagMappings, List.of())),
            local(updatedAt)
        );
    }

    private Ingredient(
        Long id,
        String koreanName,
        String englishName,
        String description,
        List<String> infoSources,
        List<String> aliases,
        List<IngredientTag> tags,
        LocalDateTime updatedAt
    ) {
        this.id = id;
        this.koreanName = koreanName;
        this.englishName = englishName;
        this.description = description;
        this.updatedAt = updatedAt;
        this.aliases = aliases;
        this.infoSources = infoSources;
        this.tags = tags;
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

    public boolean hasId(Long ingredientId) {
        return Objects.equals(id, ingredientId);
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

    public List<String> aliases() {
        return aliases;
    }

    public List<String> effectSources() {
        return tags.stream()
            .filter(IngredientTag::isDisplayedSkinEffect)
            .flatMap(tag -> tag.sources().stream())
            .map(source -> referenceOf(id, source))
            .distinct()
            .toList();
    }

    private static String referenceOf(Long id, String source) {
        String suffix = "(성분코드 " + id + ")";
        // 내부 ID는 공식 성분코드와 다르다. 기존 적재가 붙인 내부 번호를 인용에서 제거한다.
        if (source.startsWith("대한화장품협회 성분사전 「") && source.endsWith(suffix)) {
            return source.substring(0, source.length() - suffix.length()).strip();
        }
        return source;
    }
}
