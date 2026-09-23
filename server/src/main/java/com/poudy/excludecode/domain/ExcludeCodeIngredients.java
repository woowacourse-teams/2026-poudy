package com.poudy.excludecode.domain;

import com.poudy.ingredient.domain.ExcludeCode;
import com.poudy.ingredient.domain.IngredientCatalog;
import com.poudy.ingredient.domain.Ingredients;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public class ExcludeCodeIngredients {

    private final Map<ExcludeCode, List<ExcludeCodeIngredient>> ingredients;
    private final Map<Long, List<ExcludeCode>> codesByIngredientId;

    private ExcludeCodeIngredients(
        Map<ExcludeCode, List<ExcludeCodeIngredient>> ingredients,
        Map<Long, List<ExcludeCode>> codesByIngredientId
    ) {
        this.ingredients = ingredients;
        this.codesByIngredientId = codesByIngredientId;
    }

    public static ExcludeCodeIngredients from(
        Map<ExcludeCode, List<Long>> ingredientIds,
        IngredientCatalog allIngredients
    ) {
        requireEveryCodeDefined(ingredientIds);
        List<ResolvedExcludeCode> resolved = resolveAll(ingredientIds, allIngredients);
        requireEveryReferenceResolved(resolved);

        return new ExcludeCodeIngredients(index(resolved), indexCodes(resolved));
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

    private static void requireEveryCodeDefined(Map<ExcludeCode, List<Long>> ingredientIds) {
        List<ExcludeCode> undefined = Arrays.stream(ExcludeCode.values())
            .filter(code -> !ingredientIds.containsKey(code))
            .toList();
        if (!undefined.isEmpty()) {
            throw new InvalidExcludeCodeDefinitionException("제외 성분군 정의를 찾지 못했습니다: " + undefined);
        }
        Arrays.stream(ExcludeCode.values())
            .filter(code -> ingredientIds.get(code).isEmpty())
            .findFirst()
            .ifPresent(code -> {
                throw new InvalidExcludeCodeDefinitionException("제외 성분군에 속한 성분이 없습니다: " + code);
            });
    }

    private static List<ResolvedExcludeCode> resolveAll(
        Map<ExcludeCode, List<Long>> ingredientIds,
        IngredientCatalog ingredients
    ) {
        return Arrays.stream(ExcludeCode.values())
            .map(code -> ResolvedExcludeCode.of(code, ingredientIds.get(code), ingredients))
            .toList();
    }

    private static void requireEveryReferenceResolved(List<ResolvedExcludeCode> resolved) {
        List<String> missing = resolved.stream()
            .flatMap(ResolvedExcludeCode::missingReferences)
            .toList();

        if (!missing.isEmpty()) {
            throw new InvalidExcludeCodeDefinitionException("성분 데이터에서 제외 성분군의 성분을 찾지 못했습니다: " + missing);
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
