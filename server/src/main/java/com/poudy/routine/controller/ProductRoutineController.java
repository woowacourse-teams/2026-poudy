package com.poudy.routine.controller;

import com.poudy.routine.controller.dto.SharedRoutineListResponse;
import com.poudy.routine.service.RoutineService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "공개 루틴", description = "로그인 없이 보는 공개 루틴 API")
@RestController
@RequestMapping("/api/products")
public class ProductRoutineController {

    private static final int ROUTINE_PREVIEW_SIZE = 3;

    private final RoutineService routineService;

    public ProductRoutineController(RoutineService routineService) {
        this.routineService = routineService;
    }

    @Operation(summary = "제품을 담은 공개 루틴 조회", description = "제품을 아침이나 저녁에 담은 공개 루틴을 좋아요가 많은 순으로 최대 3개 "
        + "조회한다. 좋아요 수가 같으면 최신순이고 좋아요가 없는 루틴도 넣는다. 탈퇴한 회원의 루틴은 뺀다. "
        + "담은 루틴이 없으면 빈 목록이다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping("/{productId}/routines")
    public ResponseEntity<SharedRoutineListResponse> findProductRoutines(@PathVariable long productId) {
        return ResponseEntity.ok(
            SharedRoutineListResponse.from(routineService.findMostLikedContaining(productId, ROUTINE_PREVIEW_SIZE))
        );
    }
}
