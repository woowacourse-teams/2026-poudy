package com.poudy.excludecode.domain;

import com.poudy.exception.InfrastructureException;
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

    public ExcludeCodeIngredients(Ingredients allIngredients) {
        List<ResolvedExcludeCode> resolved = resolveAll(allIngredients);
        requireEveryNameResolved(resolved);

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

    private static List<ResolvedExcludeCode> resolveAll(Ingredients ingredients) {
        return Arrays.stream(ExcludeCode.values())
                .map(code -> ResolvedExcludeCode.of(code, ingredients))
                .toList();
    }

    private static void requireEveryNameResolved(List<ResolvedExcludeCode> resolved) {
        List<String> missing = resolved.stream()
                .flatMap(ResolvedExcludeCode::missingNames)
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
