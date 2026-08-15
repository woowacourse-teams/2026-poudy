package com.poudy.excludecode.domain;

import com.poudy.exception.InfrastructureException;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.repository.IngredientRepository;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class ExcludeCodeIngredients {

    private static final Pattern SYNTHETIC_COLORANT = Pattern.compile("^[가-힣]+색\\d+호(?:의\\(\\d+\\))?$");
    private static final Pattern COLOR_INDEX = Pattern
            .compile("(?:^|[, /])CI\\s*(\\d+(?::\\d+)?)\\b", Pattern.CASE_INSENSITIVE);

    private final Map<ExcludeCode, List<ExcludeCodeIngredient>> ingredients;

    public ExcludeCodeIngredients(IngredientRepository ingredientRepository) {
        this.ingredients = resolve(ingredientRepository.findAll());
    }

    public List<ExcludeCodeIngredient> of(ExcludeCode code) {
        return ingredients.getOrDefault(code, List.of());
    }

    public Set<Long> idsOf(List<ExcludeCode> codes) {
        if (codes == null) {
            return Set.of();
        }

        return codes.stream().flatMap(code -> of(code).stream()).map(ExcludeCodeIngredient::id)
                .collect(Collectors.toUnmodifiableSet());
    }

    public List<ExcludeCode> codesOf(Long ingredientId) {
        return Arrays.stream(ExcludeCode.values())
                .filter(code -> of(code).stream().anyMatch(ingredient -> ingredient.id().equals(ingredientId)))
                .toList();
    }

    private static Map<ExcludeCode, List<ExcludeCodeIngredient>> resolve(List<Ingredient> all) {
        Map<String, Ingredient> byKoreanName = index(all, Ingredient::koreanName);
        Map<String, Ingredient> byEnglishName = index(all, ingredient -> ingredient.englishName().toLowerCase());

        Map<ExcludeCode, List<ExcludeCodeIngredient>> resolved = new EnumMap<>(ExcludeCode.class);
        List<String> missing = new ArrayList<>();

        Arrays.stream(ExcludeCode.values()).filter(code -> code != ExcludeCode.SYNTHETIC_COLORANTS).forEach(code -> {
            List<ExcludeCodeIngredient> found = new ArrayList<>();
            for (String name : code.ingredientNames()) {
                lookUp(byKoreanName, byEnglishName, name).map(ExcludeCodeIngredient::from)
                        .ifPresentOrElse(found::add, () -> missing.add(code + " 의 " + name));
            }
            resolved.put(code, List.copyOf(found));
        });

        resolved.put(ExcludeCode.SYNTHETIC_COLORANTS, syntheticColorants(all));

        if (!missing.isEmpty()) {
            throw new InfrastructureException("성분 데이터에서 제외 성분군의 성분을 찾지 못했습니다: " + missing);
        }

        return Map.copyOf(resolved);
    }

    static boolean isSyntheticColorant(String koreanName) {
        return koreanName != null && SYNTHETIC_COLORANT.matcher(koreanName).matches();
    }

    static Set<String> colorIndexesOf(String englishName) {
        if (englishName == null) {
            return Set.of();
        }

        return COLOR_INDEX.matcher(englishName).results().map(result -> result.group(1))
                .collect(Collectors.toUnmodifiableSet());
    }

    static boolean isSyntheticColorant(String koreanName, String englishName, Set<String> registeredColorIndexes) {
        return isSyntheticColorant(koreanName)
                || colorIndexesOf(englishName).stream().anyMatch(registeredColorIndexes::contains);
    }

    private static List<ExcludeCodeIngredient> syntheticColorants(List<Ingredient> all) {
        Set<String> registeredColorIndexes = all.stream()
                .filter(ingredient -> isSyntheticColorant(ingredient.koreanName()))
                .flatMap(ingredient -> colorIndexesOf(ingredient.englishName()).stream())
                .collect(Collectors.toUnmodifiableSet());

        return all.stream()
                .filter(
                        ingredient -> isSyntheticColorant(
                                ingredient.koreanName(),
                                ingredient.englishName(),
                                registeredColorIndexes))
                .map(ExcludeCodeIngredient::from).toList();
    }

    private static Optional<Ingredient> lookUp(
            Map<String, Ingredient> byKoreanName,
            Map<String, Ingredient> byEnglishName,
            String name) {
        return Optional.ofNullable(byKoreanName.get(name))
                .or(() -> Optional.ofNullable(byEnglishName.get(name.toLowerCase())));
    }

    private static Map<String, Ingredient> index(List<Ingredient> all, Function<Ingredient, String> key) {
        return all.stream().filter(ingredient -> !key.apply(ingredient).isEmpty()).collect(
                Collectors.toMap(
                        key,
                        Function.identity(),
                        (first, second) -> first.id() <= second.id() ? first : second,
                        LinkedHashMap::new));
    }
}
