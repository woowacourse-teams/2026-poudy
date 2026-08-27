package com.poudy.excludecode.controller;

import com.poudy.excludecode.controller.dto.ExcludeCodeListResponse;
import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "제외 성분군", description = "빠른 필터 조회 API")
@RestController
@RequestMapping("/api/exclude-codes")
public class ExcludeCodeController {

    private final ExcludeCodeIngredients excludeCodeIngredients;

    public ExcludeCodeController(ExcludeCodeIngredients excludeCodeIngredients) {
        this.excludeCodeIngredients = excludeCodeIngredients;
    }

    @Operation(summary = "제외 성분군 조회", description = "빠른 필터에 쓰는 성분군 전체와 각 성분군에 속한 성분을 조회한다. "
        + "제품 조회에는 고른 성분군의 code 를 excludeCodes 로 보낸다. ingredients 는 성분군에 무엇이 속하는지 보여주는 데 쓴다.")
    @GetMapping
    public ResponseEntity<ExcludeCodeListResponse> findExcludeCodes() {
        return ResponseEntity.ok(ExcludeCodeListResponse.from(excludeCodeIngredients));
    }
}
