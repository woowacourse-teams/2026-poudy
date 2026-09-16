package com.poudy.skintype.controller;

import com.poudy.skintype.controller.dto.SkinTypesResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "피부타입", description = "피부타입 조회 API")
@RestController
@RequestMapping("/api/skin-types")
public class SkinTypeController {

    @Operation(summary = "피부타입 조회", description = "피부타입 코드와 표시명을 건성, 지성, 민감성, 복합성 순서로 조회한다.")
    @GetMapping
    public ResponseEntity<SkinTypesResponse> findSkinTypes() {
        return ResponseEntity.ok(SkinTypesResponse.from());
    }
}
