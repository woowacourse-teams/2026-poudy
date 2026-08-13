package com.poudy.ingredient.controller;

import com.poudy.ingredient.dto.EffectResponse;
import com.poudy.ingredient.dto.IngredientDetailResponse;
import com.poudy.ingredient.dto.IngredientListResponse;
import com.poudy.ingredient.dto.IngredientResponse;
import com.poudy.ingredient.dto.IngredientSummaryResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "성분")
@RestController
@RequestMapping("/api/ingredients")
public class IngredientController {

    private static final EffectResponse SAMPLE_EFFECT = new EffectResponse(1L, "보습", "#4CAF50");
    private static final OffsetDateTime SAMPLE_UPDATED_AT = OffsetDateTime.parse("2026-08-01T09:30:00+09:00");

    @GetMapping
    public ResponseEntity<IngredientListResponse> findIngredients(@RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(new IngredientListResponse(List.of(sampleIngredient(1005L))));
    }

    @GetMapping("/{ingredientId}")
    public ResponseEntity<IngredientDetailResponse> findIngredient(@PathVariable Long ingredientId) {
        return ResponseEntity.ok(sampleIngredientDetail(ingredientId));
    }

    private IngredientResponse sampleIngredient(Long id) {
        return new IngredientResponse(id, "글리세린", "Glycerin", List.of(SAMPLE_EFFECT), List.of());
    }

    private IngredientDetailResponse sampleIngredientDetail(Long id) {
        return new IngredientDetailResponse(id, "글리세린", "Glycerin", "피부 표면의 수분을 끌어당겨 유지시키는 대표적인 보습 성분이다.",
                List.of(SAMPLE_EFFECT), List.of(), 84L, List.of("대한화장품협회 성분사전"), List.of("PubMed 논문 링크"),
                List.of(new IngredientSummaryResponse(1010L, "부틸렌글라이콜", "Butylene Glycol")), SAMPLE_UPDATED_AT);
    }
}
