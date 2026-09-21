package com.poudy.curation.controller;

import com.poudy.curation.controller.dto.CurationDetailResponse;
import com.poudy.curation.controller.dto.CurationListResponse;
import com.poudy.curation.service.CurationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Positive;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "큐레이션", description = "큐레이션 조회 API")
@RestController
@RequestMapping("/api/curations")
public class CurationController {
    private final CurationService curationService;

    public CurationController(CurationService curationService) {
        this.curationService = curationService;
    }

    @Operation(summary = "큐레이션 목록 조회", description = "게시 중이며 배너 노출이 활성화된 큐레이션을 지정된 순서로 조회한다.")
    @GetMapping
    public ResponseEntity<CurationListResponse> findCurations() {
        return ResponseEntity.ok(CurationListResponse.from(curationService.findCurations()));
    }

    @Operation(summary = "큐레이션 상세 조회", description = "요청한 ID의 큐레이션 상세를 조회한다. 큐레이션이 게시되지 않은 경우 조회할 수 없다.")
    @GetMapping("/{curationId}")
    public ResponseEntity<CurationDetailResponse> findCuration(
        @Parameter(example = "12") @Positive @PathVariable Long curationId
    ) {
        return ResponseEntity.ok(CurationDetailResponse.from(curationService.findDetail(curationId)));
    }
}
