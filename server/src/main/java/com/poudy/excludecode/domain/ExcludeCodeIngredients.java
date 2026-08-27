package com.poudy.excludecode.domain;

import com.poudy.exception.InfrastructureException;
import com.poudy.ingredient.domain.Ingredients;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public class ExcludeCodeIngredients {

    private final Map<ExcludeCode, List<ExcludeCodeIngredient>> ingredients;
    private final Map<Long, List<ExcludeCode>> codesByIngredientId;

    public ExcludeCodeIngredients(List<ExcludeCodeMapping> mappings, Ingredients allIngredients) {
        List<ResolvedExcludeCode> resolved = resolveAll(byCode(mappings), allIngredients);
        requireEveryReferenceResolved(resolved);

        this.ingredients = index(resolved);
        this.codesByIngredientId = indexCodes(resolved);
    }

    public List<ExcludeCodeIngredient> of(ExcludeCode code) {
        return ingredients.get(code);
    }

    public Set<Long> idsOf(List<ExcludeCode> codes) {
        return codes.stream()
            .flatMap(code -> of(code).stream())
            .map(ExcludeCodeIngredient::id)
            .collect(Collectors.toUnmodifiableSet());
    }

    public List<ExcludeCode> codesOf(Long ingredientId) {
        return codesByIngredientId.getOrDefault(ingredientId, List.of());
    }

    public List<ExcludeCode> freeCodesOf(Ingredients productIngredients) {
        return Arrays.stream(ExcludeCode.values())
            .filter(code -> !productIngredients.containsAny(idsOf(List.of(code))))
            .toList();
    }

    private static Map<ExcludeCode, ExcludeCodeMapping> byCode(List<ExcludeCodeMapping> mappings) {
        Map<ExcludeCode, ExcludeCodeMapping> byCode = new EnumMap<>(ExcludeCode.class);

        for (ExcludeCodeMapping mapping : mappings) {
            if (mapping.ingredientIds().isEmpty()) {
                throw new InfrastructureException("제외 성분군에 속한 성분이 없습니다: " + mapping.code());
            }
            if (byCode.put(mapping.code(), mapping) != null) {
                throw new InfrastructureException("제외 성분군 정의가 중복됐습니다: " + mapping.code());
            }
        }

        List<ExcludeCode> undefined = Arrays.stream(ExcludeCode.values())
            .filter(code -> !byCode.containsKey(code))
            .toList();
        if (!undefined.isEmpty()) {
            throw new InfrastructureException("제외 성분군 정의를 찾지 못했습니다: " + undefined);
        }

        return byCode;
    }

    private static List<ResolvedExcludeCode> resolveAll(
        Map<ExcludeCode, ExcludeCodeMapping> byCode,
        Ingredients ingredients
    ) {
        return Arrays.stream(ExcludeCode.values())
            .map(code -> ResolvedExcludeCode.of(byCode.get(code), ingredients))
            .toList();
    }

    private static void requireEveryReferenceResolved(List<ResolvedExcludeCode> resolved) {
        List<String> missing = resolved.stream()
            .flatMap(ResolvedExcludeCode::missingReferences)
            .toList();

        if (!missing.isEmpty()) {
            throw new InfrastructureException("성분 데이터에서 제외 성분군의 성분을 찾지 못했습니다: " + missing);
        }
    }

    private static Map<ExcludeCode, List<ExcludeCodeIngredient>> index(List<ResolvedExcludeCode> resolved) {
        return resolved.stream()
            .collect(Collectors.toUnmodifiableMap(ResolvedExcludeCode::code, ResolvedExcludeCode::found));
    }

    private static Map<Long, List<ExcludeCode>> indexCodes(List<ResolvedExcludeCode> resolved) {
        Map<Long, List<ExcludeCode>> codes = new LinkedHashMap<>();

        for (ResolvedExcludeCode each : resolved) {
            addCode(codes, each);
        }
        codes.replaceAll((id, found) -> List.copyOf(found));

        return Map.copyOf(codes);
    }

    private static void addCode(Map<Long, List<ExcludeCode>> codes, ResolvedExcludeCode resolved) {
        for (ExcludeCodeIngredient ingredient : resolved.found()) {
            codes.computeIfAbsent(ingredient.id(), id -> new ArrayList<>()).add(resolved.code());
        }
    }
}
