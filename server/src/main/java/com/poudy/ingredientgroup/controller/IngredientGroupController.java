package com.poudy.ingredientgroup.controller;

import com.poudy.ingredientgroup.controller.dto.IngredientGroupListResponse;
import com.poudy.ingredientgroup.controller.dto.IngredientGroupResponse;
import com.poudy.ingredientgroup.domain.IngredientGroupType;
import com.poudy.ingredientgroup.service.IngredientGroupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "성분군", description = "성분군 조회 API")
@RestController
@RequestMapping("/api/ingredient-groups")
public class IngredientGroupController {

    private final IngredientGroupService ingredientGroupService;

    public IngredientGroupController(IngredientGroupService ingredientGroupService) {
        this.ingredientGroupService = ingredientGroupService;
    }

    @Operation(summary = "성분군 목록 조회", description = "전체 성분군과 소속 성분을 코드 순서대로 조회한다. "
        + "type=QUICK_EXCLUDE를 지정하면 빠른 제외 성분군만 반환한다.")
    @GetMapping
    public ResponseEntity<IngredientGroupListResponse> findIngredientGroups(
        @Parameter(description = "성분군 분류. 생략하면 빠른 제외를 포함한 전체 성분군") @RequestParam(required = false) IngredientGroupType type
    ) {
        return ResponseEntity.ok(IngredientGroupListResponse.from(ingredientGroupService.findAll(type)));
    }

    @Operation(summary = "성분군 상세 조회", description = "성분군 코드에 해당하는 성분군의 이름, 설명과 속한 성분을 조회한다.")
    @GetMapping("/{code}")
    public ResponseEntity<IngredientGroupResponse> findIngredientGroup(
        @Parameter(example = "CERAMIDES") @PathVariable String code
    ) {
        return ResponseEntity.ok(IngredientGroupResponse.from(ingredientGroupService.findDetail(code)));
    }
}
