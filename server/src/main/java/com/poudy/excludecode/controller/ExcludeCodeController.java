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

    private static final Map<ExcludeCode, String> SAMPLE_NAMES = Map.of(
            ExcludeCode.SENSITIVE,
            "민감성 성분 없음",
            ExcludeCode.FRAGRANCE,
            "향료 계열 없음",
            ExcludeCode.ETHANOL,
            "에탄올 계열 없음",
            ExcludeCode.PARABEN_7,
            "파라벤 7종 없음",
            ExcludeCode.MINERAL_OIL,
            "미네랄오일 없음",
            ExcludeCode.ALLERGEN,
            "알레르기 유발 성분 없음");

    private static final List<IngredientSummaryResponse> SAMPLE_INGREDIENTS = List.of(
            new IngredientSummaryResponse(2001L, "메틸파라벤", "Methylparaben"),
            new IngredientSummaryResponse(2002L, "프로필파라벤", "Propylparaben"));

    @Operation(summary = "제외 성분군 조회", description = "빠른 필터에 쓰는 성분군 전체와 각 성분군에 속한 성분을 조회한다.")
    @GetMapping
    public ResponseEntity<ExcludeCodeListResponse> findExcludeCodes() {
        return ResponseEntity.ok(
                new ExcludeCodeListResponse(Arrays.stream(ExcludeCode.values()).map(this::sampleExcludeCode).toList()));
    }

    private ExcludeCodeResponse sampleExcludeCode(ExcludeCode code) {
        return new ExcludeCodeResponse(code, SAMPLE_NAMES.get(code), SAMPLE_INGREDIENTS);
    }
}
