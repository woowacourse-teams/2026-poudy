package com.poudy.offline.sensorysource.identity;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

public record IngredientVocabularyEntry(
        long canonicalIngredientId,
        String koreanName,
        List<String> englishNames,
        List<String> aliases,
        List<IngredientVocabularyIssue> issues) {

    public IngredientVocabularyEntry(
            long canonicalIngredientId,
            String koreanName,
            List<String> englishNames,
            List<String> aliases) {
        this(canonicalIngredientId, koreanName, englishNames, aliases, List.of());
    }

    public IngredientVocabularyEntry {
        if (canonicalIngredientId <= 0) {
            throw new IllegalArgumentException("canonicalIngredientId는 양수여야 합니다.");
        }
        if (IngredientIdentityResolver.normalize(koreanName).isEmpty()) {
            throw new IllegalArgumentException("koreanName은 비어 있을 수 없습니다.");
        }

        englishNames = List.copyOf(Objects.requireNonNullElse(englishNames, List.of()));
        if (englishNames.stream().anyMatch(name -> IngredientIdentityResolver.normalize(name).isEmpty())) {
            throw new IllegalArgumentException("englishName은 비어 있을 수 없습니다.");
        }
        aliases = List.copyOf(Objects.requireNonNullElse(aliases, List.of()));
        if (aliases.stream().anyMatch(alias -> IngredientIdentityResolver.normalize(alias).isEmpty())) {
            throw new IllegalArgumentException("alias는 비어 있을 수 없습니다.");
        }
        issues = List.copyOf(Objects.requireNonNullElse(issues, List.of()));
        if (issues.stream().anyMatch(Objects::isNull)
                || issues.stream().anyMatch(issue -> issue.canonicalIngredientId() != canonicalIngredientId)) {
            throw new IllegalArgumentException("vocabulary issue의 canonical ingredient ID가 일치해야 합니다.");
        }

        Set<String> quarantinedNames = issues.stream()
                .flatMap(issue -> issue.rawValues().stream())
                .map(IngredientIdentityResolver::normalize)
                .collect(Collectors.toUnmodifiableSet());
        if (aliases.stream()
                .map(IngredientIdentityResolver::normalize)
                .anyMatch(quarantinedNames::contains)) {
            throw new IllegalArgumentException("격리한 alias를 정상 alias로 함께 등록할 수 없습니다.");
        }
    }
}
