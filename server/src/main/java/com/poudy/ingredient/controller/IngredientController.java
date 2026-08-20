package com.poudy.ingredient.controller;

import com.poudy.ingredient.controller.dto.IngredientDetailResponse;
import com.poudy.ingredient.controller.dto.IngredientListResponse;
import com.poudy.ingredient.controller.dto.IngredientQueryRequest;
import com.poudy.ingredient.service.IngredientService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "성분", description = "성분 조회 API")
@RestController
@RequestMapping("/api/ingredients")
public class IngredientController {

    private final IngredientService ingredientService;

    public IngredientController(IngredientService ingredientService) {
        this.ingredientService = ingredientService;
    }

    @Operation(summary = "성분 조회", description = "검색어 또는 여러 성분 ID 에 해당하는 성분을 ID, 이름과 피부 작용 태그만 담아 조회한다. "
            + "두 조건을 함께 보내면 모두 만족하는 성분을 조회한다. 검색어로 조회하면 검색어에 잘 맞는 순서로 최대 5 건만 반환한다. "
            + "성분 ID 로만 조회하면 상한 없이 요청한 순서를 유지하고 존재하지 않는 ID 는 결과에서 제외한다.")
    @GetMapping
    public ResponseEntity<IngredientListResponse> findIngredients(@Valid @ModelAttribute IngredientQueryRequest query) {
        return ResponseEntity.ok(IngredientListResponse.from(ingredientService.find(query)));
    }

    @Operation(summary = "성분 상세 조회", description = "성분 ID 에 해당하는 설명, 출처와 이 성분을 포함한 제품 수까지 조회한다.")
    @GetMapping("/{ingredientId}")
    public ResponseEntity<IngredientDetailResponse> findIngredientDetail(
            @Parameter(example = "1012") @PathVariable Long ingredientId) {
        return ResponseEntity.ok(IngredientDetailResponse.from(ingredientService.findDetail(ingredientId)));
    }

}
