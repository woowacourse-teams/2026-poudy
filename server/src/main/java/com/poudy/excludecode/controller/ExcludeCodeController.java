package com.poudy.excludecode.controller;

import com.poudy.excludecode.controller.dto.ExcludeCodeListResponse;
import com.poudy.excludecode.controller.dto.ExcludeCodeResponse;
import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.ingredient.controller.dto.IngredientSummaryResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Arrays;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "제외 성분군", description = "빠른 필터 조회 API")
@RestController
@RequestMapping("/api/exclude-codes")
public class ExcludeCodeController {

    @Operation(summary = "제외 성분군 조회", description = "빠른 필터에 쓰는 성분군 전체와 각 성분군에 속한 성분을 조회한다. "
            + "제품 조회에는 고른 성분군의 code 를 excludeCodes 로 보낸다. ingredients 는 성분군에 무엇이 속하는지 보여주는 데 쓴다.")
    @GetMapping
    public ResponseEntity<ExcludeCodeListResponse> findExcludeCodes() {
        return ResponseEntity.ok(
                new ExcludeCodeListResponse(Arrays.stream(ExcludeCode.values()).map(this::sampleExcludeCode).toList()));
    }

    private ExcludeCodeResponse sampleExcludeCode(ExcludeCode code) {
        return new ExcludeCodeResponse(code, code.displayName(), ingredients(code), code.description());
    }

    private static List<IngredientSummaryResponse> ingredients(ExcludeCode code) {
        return ExcludeCodeIngredients.of(code).stream()
                .map(it -> new IngredientSummaryResponse(it.id(), it.koreanName(), it.englishName())).toList();
    }
}
