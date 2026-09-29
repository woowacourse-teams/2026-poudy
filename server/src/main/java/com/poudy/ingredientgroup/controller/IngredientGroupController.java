package com.poudy.ingredientgroup.controller;

import com.poudy.ingredientgroup.controller.dto.IngredientGroupResponse;
import com.poudy.ingredientgroup.service.IngredientGroupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "성분군", description = "성분군 조회 API")
@RestController
@RequestMapping("/api/ingredient-groups")
public class IngredientGroupController {

    private final IngredientGroupService ingredientGroupService;

    public IngredientGroupController(IngredientGroupService ingredientGroupService) {
        this.ingredientGroupService = ingredientGroupService;
    }

    @Operation(summary = "성분군 상세 조회", description = "성분군 코드에 해당하는 성분군의 이름, 설명과 속한 성분을 조회한다.")
    @GetMapping("/{code}")
    public ResponseEntity<IngredientGroupResponse> findIngredientGroup(
        @Parameter(example = "CERAMIDES") @PathVariable String code
    ) {
        return ResponseEntity.ok(IngredientGroupResponse.from(ingredientGroupService.findDetail(code)));
    }
}
