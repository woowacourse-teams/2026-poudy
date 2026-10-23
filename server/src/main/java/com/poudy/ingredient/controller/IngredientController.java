package com.poudy.ingredient.controller;

import com.poudy.common.dto.KeywordRequest;
import com.poudy.common.dto.PaginationRequest;
import com.poudy.ingredient.controller.dto.IngredientDetailResponse;
import com.poudy.ingredient.controller.dto.IngredientListResponse;
import com.poudy.ingredient.controller.dto.IngredientPageResponse;
import com.poudy.ingredient.controller.dto.IngredientQueryRequest;
import com.poudy.ingredient.service.IngredientQuery;
import com.poudy.ingredient.service.IngredientService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "성분", description = "성분 조회 API")
@RestController
@RequestMapping("/api/ingredients")
public class IngredientController {

    private final IngredientService ingredientService;

    public IngredientController(IngredientService ingredientService) {
        this.ingredientService = ingredientService;
    }

    @Operation(summary = "성분 조회", description = "성분을 ID, 이름과 피부 작용 태그만 담아 페이지 단위로 조회한다. "
        + "ingredientIds 를 보내면 요청한 순서대로 해당 성분만 조회하고, 보내지 않으면 전체 성분을 조회한다. "
        + "존재하지 않는 ID 는 결과와 전체 개수에서 제외한다. "
        + "usedInProducts 를 true 로 보내면 제품 전성분에 한 번 이상 쓰인 성분만 조회한다.")
    @GetMapping
    public ResponseEntity<IngredientPageResponse> findIngredients(
        @Valid @ModelAttribute IngredientQueryRequest query,
        @Valid @ModelAttribute PaginationRequest pagination
    ) {
        return ResponseEntity.ok(
            IngredientPageResponse.from(
                ingredientService.find(
                    new IngredientQuery(query.ingredientIds(), query.usedInProducts()),
                    pagination.page(),
                    pagination.size()
                ),
                pagination
            )
        );
    }

    @Operation(summary = "성분 검색 제안 조회", description = "검색어에 해당하는 성분을 ID, 이름, 배합 목적과 피부 작용 태그, "
        + "소속 빠른 제외 성분군의 코드·이름을 담아 검색어에 잘 맞는 순서로 최대 5 건 반환한다. "
        + "formulationRoles와 excludeGroups는 해당하는 항목이 없으면 빈 배열이다. "
        + "match 는 한글명, 영문명 또는 이명 중 실제로 일치한 원문과 "
        + "그 원문을 기준으로 한 UTF-16 반열림 구간을 제공한다. groups 는 이름에 검색어가 들어간 성분군을 속한 성분 ID와 "
        + "함께 담는다. 제외 성분군은 빠른 필터로만 쓰므로 담지 않는다.")
    @Parameter(name = "keyword", example = "글리")
    @GetMapping("/suggestions")
    public ResponseEntity<IngredientListResponse> suggestIngredients(
        @Valid @ModelAttribute KeywordRequest search
    ) {
        return ResponseEntity.ok(IngredientListResponse.from(ingredientService.suggest(search.keyword())));
    }

    @Operation(summary = "성분 상세 조회", description = "성분 ID 에 해당하는 설명, 출처와 이 성분을 포함한 전체 제품 수를 조회한다. productSize를 지정하면 기본 정렬의 포함 제품을 함께 반환한다.")
    @GetMapping("/{ingredientId}")
    public ResponseEntity<IngredientDetailResponse> findIngredientDetail(
        @Parameter(example = "1012") @PathVariable Long ingredientId,
        @Parameter(description = "함께 조회할 포함 제품 수 (0~20, 생략하면 0)") @RequestParam(defaultValue = "0") @Min(0) @Max(20) int productSize
    ) {
        return ResponseEntity
            .ok(IngredientDetailResponse.from(ingredientService.findDetail(ingredientId, productSize)));
    }

}
