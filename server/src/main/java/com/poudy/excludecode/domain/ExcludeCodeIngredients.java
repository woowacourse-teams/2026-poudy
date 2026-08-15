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

    private static final Map<ExcludeCode, List<String>> NAMES = Map.of(
            ExcludeCode.FRAGRANCE_ALLERGENS,
            List.of(
                    "향료",
                    "리날룰",
                    "리모넨",
                    "시트랄",
                    "시트로넬올",
                    "제라니올",
                    "부틸페닐메틸프로피오날",
                    "벤질살리실레이트",
                    "알파-아이소메틸아이오논",
                    "헥실신남알",
                    "유제놀",
                    "아밀신남알",
                    "쿠마린"),
            ExcludeCode.DRYING_ALCOHOLS,
            List.of("변성알코올", "에탄올", "아이소프로필알코올", "에스디알코올40-B"),
            ExcludeCode.HARSH_PRESERVATIVES,
            List.of(
                    "페녹시에탄올",
                    "메틸파라벤",
                    "에틸파라벤",
                    "프로필파라벤",
                    "부틸파라벤",
                    "아이소부틸파라벤",
                    "아이소프로필파라벤",
                    "비에이치에이",
                    "비에이치티",
                    "디엠디엠하이단토인"),
            ExcludeCode.SULFATES,
            List.of("소듐라우릴설페이트", "소듐라우레스설페이트", "암모늄라우릴설페이트", "암모늄라우레스설페이트"),
            ExcludeCode.CYCLIC_SILICONES,
            List.of("사이클로테트라실록세인", "사이클로펜타실록세인", "사이클로헥사실록세인", "사이클로메티콘"));

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

        NAMES.forEach((code, names) -> {
            List<ExcludeCodeIngredient> found = new ArrayList<>();
            for (String name : names) {
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
