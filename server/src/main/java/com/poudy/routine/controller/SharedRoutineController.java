package com.poudy.routine.controller;

import com.poudy.common.dto.PaginationRequest;
import com.poudy.routine.controller.dto.SharedRoutinePageResponse;
import com.poudy.routine.controller.dto.SharedRoutineResponse;
import com.poudy.routine.service.RoutineService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "공개 루틴", description = "로그인 없이 보는 공개 루틴 API")
@RestController
@RequestMapping("/api/routines")
public class SharedRoutineController {

    private final RoutineService routineService;

    public SharedRoutineController(RoutineService routineService) {
        this.routineService = routineService;
    }

    @Operation(summary = "루틴 둘러보기", description = "제품이 하나 이상인 공개 루틴을 최신순으로 조회한다. 탈퇴한 회원의 루틴은 뺀다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping
    public ResponseEntity<SharedRoutinePageResponse> findShared(@Valid @ModelAttribute PaginationRequest pagination) {
        return ResponseEntity.ok(
            SharedRoutinePageResponse.from(
                routineService.findSharedPage(pagination.page(), pagination.size()),
                pagination
            )
        );
    }

    @Operation(summary = "공개 루틴 상세 조회", description = "메모는 주지 않는다. 제품이 없어도 열린다. 비공개 루틴과 없는 루틴은 404다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping("/{routineId}")
    public ResponseEntity<SharedRoutineResponse> findShared(@PathVariable long routineId) {
        return ResponseEntity.ok(SharedRoutineResponse.from(routineService.findShared(routineId)));
    }
}
