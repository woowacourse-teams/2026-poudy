package com.poudy.excludecode.domain;

import com.poudy.exception.InfrastructureException;
import com.poudy.ingredient.repository.IngredientRepository;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.stereotype.Component;

@Component
public class ExcludeCodeIngredients {

    private final Map<ExcludeCode, List<ExcludeCodeIngredient>> ingredients;
    private final Map<Long, List<ExcludeCode>> codesByIngredientId;

    public ExcludeCodeIngredients(IngredientRepository ingredientRepository) {
        requireEveryNameResolved(ingredientRepository);

        this.ingredients = resolveAll(ingredientRepository);
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

    private static void requireEveryNameResolved(IngredientRepository ingredientRepository) {
        // spotless:off
        List<String> missing = Arrays.stream(ExcludeCode.values())
                .flatMap(code -> missingNames(code, ingredientRepository))
                .toList();
        // spotless:on

        if (!missing.isEmpty()) {
            throw new InfrastructureException("성분 데이터에서 제외 성분군의 성분을 찾지 못했습니다: " + missing);
        }
    }

    private static Stream<String> missingNames(ExcludeCode code, IngredientRepository ingredientRepository) {
        // spotless:off
        return code.ingredientNames().stream()
                .filter(name -> ingredientRepository.findByName(name).isEmpty())
                .map(name -> code + " 의 " + name);
        // spotless:on
    }

    private static Map<ExcludeCode, List<ExcludeCodeIngredient>> resolveAll(IngredientRepository ingredientRepository) {
        // spotless:off
        return Arrays.stream(ExcludeCode.values())
                .collect(Collectors.toUnmodifiableMap(
                        Function.identity(),
                        code -> resolve(code, ingredientRepository)));
        // spotless:on
    }

    private static List<ExcludeCodeIngredient> resolve(ExcludeCode code, IngredientRepository ingredientRepository) {
        // spotless:off
        return code.ingredientNames().stream()
                .map(ingredientRepository::findByName)
                .flatMap(Optional::stream)
                .map(ExcludeCodeIngredient::from)
                .toList();
        // spotless:on
    }

    private static Map<Long, List<ExcludeCode>> indexCodes(Map<ExcludeCode, List<ExcludeCodeIngredient>> ingredients) {
        Map<Long, List<ExcludeCode>> codes = new LinkedHashMap<>();

        for (ExcludeCode code : ExcludeCode.values()) {
            addCode(codes, code, ingredients.getOrDefault(code, List.of()));
        }
        codes.replaceAll((id, found) -> List.copyOf(found));

        return Map.copyOf(codes);
    }

    private static void addCode(
            Map<Long, List<ExcludeCode>> codes,
            ExcludeCode code,
            List<ExcludeCodeIngredient> ingredients) {
        for (ExcludeCodeIngredient ingredient : ingredients) {
            codes.computeIfAbsent(ingredient.id(), id -> new ArrayList<>()).add(code);
        }
    }
}
