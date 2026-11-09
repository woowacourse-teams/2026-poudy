package com.poudy.skintype.controller;

import com.poudy.skintype.controller.dto.SkinOptionsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "피부 선택지", description = "피부 타입과 민감성 표시 정의")
@RestController
@RequestMapping("/api/skin-options")
public class SkinOptionsController {

    @Operation(summary = "전체 피부 선택지 조회", description = "검색 조건과 무관한 피부 타입과 민감성의 표시 이름을 제공한다. 제품 수는 포함하지 않는다.")
    @GetMapping
    public ResponseEntity<SkinOptionsResponse> findSkinOptions() {
        return ResponseEntity.ok(SkinOptionsResponse.from());
    }
}
