package com.poudy.curation.controller;

import com.poudy.curation.controller.dto.CurationDetailResponse;
import com.poudy.curation.controller.dto.CurationListResponse;
import com.poudy.curation.controller.dto.CurationProductListResponse;
import com.poudy.curation.service.CurationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "큐레이션", description = "큐레이션 조회 API")
@RestController
@RequestMapping("/api/curations")
public class CurationController {

    private final CurationService curationService;

    public CurationController(CurationService curationService) {
        this.curationService = curationService;
    }

    @Operation(summary = "큐레이션 목록 조회", description = "PUBLISHED 상태의 큐레이션을 ID 오름차순으로 조회한다.")
    @GetMapping
    public ResponseEntity<CurationListResponse> findCurations() {
        return ResponseEntity.ok(CurationListResponse.from(curationService.findCurations()));
    }

    @Operation(summary = "큐레이션 상세 조회", description = "PUBLISHED 상태인 큐레이션의 상세 정보와 제품 필터용 카테고리를 조회한다.")
    @GetMapping("/{curationId}")
    public ResponseEntity<CurationDetailResponse> findCuration(
        @Parameter(example = "12") @PathVariable Long curationId
    ) {
        return ResponseEntity.ok(CurationDetailResponse.from(curationService.findDetail(curationId)));
    }

    @Operation(summary = "큐레이션 제품 조회", description = "PUBLISHED 상태인 큐레이션의 제품을 등록 순서로 조회한다. categoryId로 필터해도 순서를 유지한다.")
    @GetMapping("/{curationId}/products")
    public ResponseEntity<CurationProductListResponse> findCurationProducts(
        @Parameter(example = "12") @PathVariable Long curationId,
        @Parameter(description = "제품을 필터링할 카테고리 ID", example = "1") @RequestParam(required = false) Long categoryId
    ) {
        return ResponseEntity.ok(
            CurationProductListResponse.from(curationService.findProducts(curationId, categoryId))
        );
    }
}
