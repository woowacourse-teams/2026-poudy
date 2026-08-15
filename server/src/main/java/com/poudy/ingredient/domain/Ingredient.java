package com.poudy.ingredient.domain;

import com.poudy.tag.domain.FormulationRole;
import com.poudy.tag.domain.SkinEffect;
import com.poudy.tag.domain.TagCategory;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

public record Ingredient(
        Long id,
        String koreanName,
        String englishName,
        String originDefinition,
        String description,
        String descriptionEvidence,
        List<String> aliases,
        List<IngredientTag> tagMappings,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    private static final String EVIDENCE_DELIMITER = ";";
    private static final String INFO_SOURCE_MARKER = "대한화장품협회";

    public Ingredient {
        englishName = englishName == null ? "" : englishName;
        originDefinition = originDefinition == null ? "" : originDefinition;
        descriptionEvidence = descriptionEvidence == null ? "" : descriptionEvidence;
        aliases = aliases == null ? List.of() : List.copyOf(aliases);
        tagMappings = tagMappings == null ? List.of() : List.copyOf(tagMappings);
    }

    public List<IngredientTag> tagsOf(TagCategory category) {
        return tagMappings.stream().filter(tag -> tag.isOf(category)).toList();
    }

    public List<FormulationRole> formulationRoles() {
        return namesOf(TagCategory.FUNCTION).map(FormulationRole::from).flatMap(Optional::stream).toList();
    }

    public List<SkinEffect> skinEffects() {
        return namesOf(TagCategory.BIOLOGICAL_EFFECT).map(SkinEffect::from).flatMap(Optional::stream).toList();
    }

    public List<String> infoSources() {
        return evidences().filter(evidence -> evidence.startsWith(INFO_SOURCE_MARKER)).toList();
    }

    public List<String> effectSources() {
        return evidences().filter(evidence -> !evidence.startsWith(INFO_SOURCE_MARKER)).toList();
    }

    private Stream<String> evidences() {
        List<String> evidences = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        int parenthesisDepth = 0;

        for (int index = 0; index < descriptionEvidence.length(); index++) {
            char character = descriptionEvidence.charAt(index);
            if (character == '(') {
                parenthesisDepth++;
            } else if (character == ')' && parenthesisDepth > 0) {
                parenthesisDepth--;
            }

            if (character == EVIDENCE_DELIMITER.charAt(0) && parenthesisDepth == 0) {
                addEvidence(evidences, current);
                current.setLength(0);
                continue;
            }
            current.append(character);
        }
        addEvidence(evidences, current);

        return evidences.stream();
    }

    private static void addEvidence(List<String> evidences, StringBuilder candidate) {
        String evidence = candidate.toString().trim();
        if (!evidence.isEmpty()) {
            evidences.add(evidence);
        }
    }

    private Stream<String> namesOf(TagCategory category) {
        return tagMappings.stream().filter(tag -> tag.isOf(category)).map(IngredientTag::name);
    }
}
