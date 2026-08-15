package com.poudy.excludecode.domain;

import com.poudy.exception.InfrastructureException;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.repository.IngredientRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.BinaryOperator;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class ExcludeCodeIngredients {

    private final Map<ExcludeCode, List<ExcludeCodeIngredient>> ingredients;
    private final Map<Long, List<ExcludeCode>> codesByIngredientId;

    public ExcludeCodeIngredients(IngredientRepository ingredientRepository) {
        this.ingredients = resolve(ingredientRepository.findAll());
        this.codesByIngredientId = indexCodes(this.ingredients);
    }

    public List<ExcludeCodeIngredient> of(ExcludeCode code) {
        return ingredients.getOrDefault(code, List.of());
    }

    public Set<Long> idsOf(List<ExcludeCode> codes) {
        if (codes == null) {
            return Set.of();
        }

        // spotless:off
        return codes.stream()
                .flatMap(code -> of(code).stream())
                .map(ExcludeCodeIngredient::id)
                .collect(Collectors.toUnmodifiableSet());
        // spotless:on
    }

    public List<ExcludeCode> codesOf(Long ingredientId) {
        return codesByIngredientId.getOrDefault(ingredientId, List.of());
    }

    private static Map<ExcludeCode, List<ExcludeCodeIngredient>> resolve(List<Ingredient> all) {
        Map<String, Ingredient> byKoreanName = index(all, Ingredient::koreanName);
        Map<String, Ingredient> byEnglishName = index(all, Ingredient::lowerCaseEnglishName);

        Map<ExcludeCode, List<ExcludeCodeIngredient>> resolved = new EnumMap<>(ExcludeCode.class);
        List<String> missing = new ArrayList<>();

        for (ExcludeCode code : ExcludeCode.values()) {
            List<ExcludeCodeIngredient> found = new ArrayList<>();
            for (String name : code.ingredientNames()) {
                // spotless:off
                lookUp(byKoreanName, byEnglishName, name)
                        .map(ExcludeCodeIngredient::from)
                        .ifPresentOrElse(found::add, () -> missing.add(code + " 의 " + name));
                // spotless:on
            }
            resolved.put(code, List.copyOf(found));
        }

        if (!missing.isEmpty()) {
            throw new InfrastructureException("성분 데이터에서 제외 성분군의 성분을 찾지 못했습니다: " + missing);
        }

        return Map.copyOf(resolved);
    }

    private static Map<Long, List<ExcludeCode>> indexCodes(Map<ExcludeCode, List<ExcludeCodeIngredient>> ingredients) {
        Map<Long, List<ExcludeCode>> codes = new LinkedHashMap<>();

        for (ExcludeCode code : ExcludeCode.values()) {
            for (ExcludeCodeIngredient ingredient : ingredients.getOrDefault(code, List.of())) {
                codes.computeIfAbsent(ingredient.id(), id -> new ArrayList<>()).add(code);
            }
        }
        codes.replaceAll((id, found) -> List.copyOf(found));

        return Map.copyOf(codes);
    }

    private static Optional<Ingredient> lookUp(
            Map<String, Ingredient> byKoreanName,
            Map<String, Ingredient> byEnglishName,
            String name) {
        return Optional.ofNullable(byKoreanName.get(name))
                .or(() -> Optional.ofNullable(byEnglishName.get(name.toLowerCase())));
    }

    private static Map<String, Ingredient> index(List<Ingredient> all, Function<Ingredient, String> key) {
        // spotless:off
        return all.stream()
                .filter(ingredient -> !key.apply(ingredient).isEmpty())
                .collect(Collectors.toMap(
                        key,
                        Function.identity(),
                        BinaryOperator.minBy(Comparator.comparing(Ingredient::id)),
                        LinkedHashMap::new));
        // spotless:on
    }
}
