package com.poudy.excludecode.controller;

import com.poudy.excludecode.controller.dto.ExcludeCodeListResponse;
import com.poudy.excludecode.controller.dto.ExcludeCodeResponse;
import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.ingredient.controller.dto.IngredientSummaryResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "제외 성분군", description = "빠른 필터 조회 API")
@RestController
@RequestMapping("/api/exclude-codes")
public class ExcludeCodeController {

    private static final Map<ExcludeCode, List<IngredientSummaryResponse>> SAMPLE_INGREDIENTS = Map.of(
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

    @Operation(summary = "제외 성분군 조회", description = "빠른 필터에 쓰는 성분군 전체와 각 성분군에 속한 성분을 조회한다. "
            + "제품 조회는 성분군을 받지 않으므로, 고른 성분군의 ingredients 를 excludeIngredientIds 로 펼쳐 보낸다.")
    @GetMapping
    public ResponseEntity<ExcludeCodeListResponse> findExcludeCodes() {
        return ResponseEntity.ok(
                new ExcludeCodeListResponse(Arrays.stream(ExcludeCode.values()).map(this::sampleExcludeCode).toList()));
    }

    private ExcludeCodeResponse sampleExcludeCode(ExcludeCode code) {
        return new ExcludeCodeResponse(code, code.displayName(), SAMPLE_INGREDIENTS.get(code), code.description());
    }

    private static IngredientSummaryResponse ingredient(Long id, String koreanName, String englishName) {
        return new IngredientSummaryResponse(id, koreanName, englishName);
    }
}
