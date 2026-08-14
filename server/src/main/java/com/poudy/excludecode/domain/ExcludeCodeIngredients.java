package com.poudy.excludecode.domain;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public final class ExcludeCodeIngredients {

    private static final Map<ExcludeCode, List<ExcludeCodeIngredient>> INGREDIENTS = Map.of(
            ExcludeCode.FRAGRANCE_ALLERGENS,
            List.of(
                    ingredient(2101L, "향료", "Fragrance / Parfum"),
                    ingredient(2102L, "리날룰", "Linalool"),
                    ingredient(2103L, "리모넨", "Limonene"),
                    ingredient(2104L, "시트랄", "Citral"),
                    ingredient(2105L, "시트로네롤", "Citronellol"),
                    ingredient(2106L, "제라니올", "Geraniol"),
                    ingredient(2107L, "부틸페닐메틸프로피오날", "Butylphenyl Methylpropional"),
                    ingredient(2108L, "벤질살리실레이트", "Benzyl Salicylate"),
                    ingredient(2109L, "알파-아이소메틸아이오논", "Alpha-Isomethyl Ionone"),
                    ingredient(2110L, "헥실신남알", "Hexyl Cinnamal"),
                    ingredient(2111L, "유제놀", "Eugenol"),
                    ingredient(2112L, "아밀신남알", "Amyl Cinnamal"),
                    ingredient(2113L, "쿠마린", "Coumarin")),
            ExcludeCode.DRYING_ALCOHOLS,
            List.of(
                    ingredient(2201L, "변성알코올", "Alcohol Denat."),
                    ingredient(2202L, "에탄올", "Ethanol"),
                    ingredient(2203L, "이소프로필알코올", "Isopropyl Alcohol"),
                    ingredient(2204L, "에틸알코올", "Alcohol"),
                    ingredient(2205L, "에스디알코올", "SD Alcohol")),
            ExcludeCode.HARSH_PRESERVATIVES,
            List.of(
                    ingredient(2301L, "페녹시에탄올", "Phenoxyethanol"),
                    ingredient(2302L, "메틸파라벤", "Methylparaben"),
                    ingredient(2303L, "에틸파라벤", "Ethylparaben"),
                    ingredient(2304L, "프로필파라벤", "Propylparaben"),
                    ingredient(2305L, "부틸파라벤", "Butylparaben"),
                    ingredient(2306L, "아이소부틸파라벤", "Isobutylparaben"),
                    ingredient(2307L, "아이소프로필파라벤", "Isopropylparaben"),
                    ingredient(2308L, "비엔에이치에이(BHA)", "BHA"),
                    ingredient(2309L, "비에이치티(BHT)", "BHT"),
                    ingredient(2310L, "디엠디엠하이단토인", "DMDM Hydantoin")),
            ExcludeCode.SULFATES,
            List.of(
                    ingredient(2401L, "소듐라우릴설페이트", "Sodium Lauryl Sulfate (SLS)"),
                    ingredient(2402L, "소듐라우레스설페이트", "Sodium Laureth Sulfate (SLES)"),
                    ingredient(2403L, "암모늄라우릴설페이트", "Ammonium Lauryl Sulfate (ALS)"),
                    ingredient(2404L, "암모늄라우레스설페이트", "Ammonium Laureth Sulfate (ALES)")),
            ExcludeCode.CYCLIC_SILICONES,
            List.of(
                    ingredient(2501L, "사이클로테트라실록세인(D4)", "Cyclotetrasiloxane"),
                    ingredient(2502L, "사이클로펜타실록세인(D5)", "Cyclopentasiloxane"),
                    ingredient(2503L, "사이클로헥사실록세인(D6)", "Cyclohexasiloxane"),
                    ingredient(2504L, "사이클로메티콘", "Cyclomethicone")),
            ExcludeCode.SYNTHETIC_COLORANTS,
            List.of(
                    ingredient(2601L, "황색4호", "CI 19140 (Yellow 5)"),
                    ingredient(2602L, "황색5호", "CI 15985 (Yellow 6)"),
                    ingredient(2603L, "적색201호", "CI 15850 (Red 6)"),
                    ingredient(2604L, "적색202호", "CI 15850 (Red 7)"),
                    ingredient(2605L, "적색227호", "CI 17200 (Red 33)"),
                    ingredient(2606L, "청색1호", "CI 42090 (Blue 1)"),
                    ingredient(2607L, "녹색3호", "CI 42053 (Green 3)")));

    private ExcludeCodeIngredients() {
    }

    public static List<ExcludeCodeIngredient> of(ExcludeCode code) {
        return INGREDIENTS.getOrDefault(code, List.of());
    }

    public static Set<Long> idsOf(List<ExcludeCode> codes) {
        if (codes == null) {
            return Set.of();
        }

        return codes.stream().flatMap(code -> of(code).stream()).map(ExcludeCodeIngredient::id)
                .collect(Collectors.toUnmodifiableSet());
    }

    private static ExcludeCodeIngredient ingredient(Long id, String koreanName, String englishName) {
        return new ExcludeCodeIngredient(id, koreanName, englishName);
    }
}
