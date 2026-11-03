package com.poudy.routine.controller;

import com.poudy.routine.controller.dto.RoutineCreateRequest;
import com.poudy.routine.controller.dto.RoutineProductsRequest;
import com.poudy.routine.controller.dto.RoutineResponse;
import com.poudy.routine.controller.dto.RoutineUpdateRequest;
import com.poudy.routine.controller.dto.RoutinesResponse;
import com.poudy.routine.service.RoutineService;
import com.poudy.security.session.LoginMember;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "루틴", description = "로그인한 회원의 루틴 API")
@RestController
@RequestMapping("/api/users/me/routines")
public class RoutineController {

    private final RoutineService routineService;

    public RoutineController(RoutineService routineService) {
        this.routineService = routineService;
    }

    @Operation(summary = "루틴 만들기", description = "아침·저녁 제품은 선택이며 바르는 순서대로 보낸다. "
        + "한 구간에 같은 제품을 두 번 담을 수 없고, 아침과 저녁에는 같은 제품을 담을 수 있다.")
    @ApiResponse(responseCode = "201", description = "만들기 성공")
    @PostMapping
    public ResponseEntity<RoutineResponse> create(
        @AuthenticationPrincipal LoginMember loginMember,
        @Valid @RequestBody RoutineCreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
            RoutineResponse.from(
                routineService.create(
                    loginMember.id(),
                    request.routineName(),
                    request.routineMemo(),
                    request.isPublic(),
                    request.products()
                )
            )
        );
    }

    @Operation(summary = "내 루틴 목록 조회", description = "내 루틴 전부를 최근 만든 순으로 조회한다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping
    public ResponseEntity<RoutinesResponse> findMine(@AuthenticationPrincipal LoginMember loginMember) {
        return ResponseEntity.ok(RoutinesResponse.from(routineService.findMine(loginMember.id())));
    }

    @Operation(summary = "내 루틴 상세 조회", description = "메모와 구간별 제품을 바르는 순서대로 조회한다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping("/{routineId}")
    public ResponseEntity<RoutineResponse> findMine(
        @AuthenticationPrincipal LoginMember loginMember,
        @PathVariable long routineId
    ) {
        return ResponseEntity.ok(RoutineResponse.from(routineService.findMine(loginMember.id(), routineId)));
    }

    @Operation(summary = "루틴 수정", description = "이름·메모·공개 여부를 통째로 바꾼다. 메모를 null이나 빈 값으로 보내면 지운다.")
    @ApiResponse(responseCode = "200", description = "수정 성공")
    @PutMapping("/{routineId}")
    public ResponseEntity<RoutineResponse> update(
        @AuthenticationPrincipal LoginMember loginMember,
        @PathVariable long routineId,
        @Valid @RequestBody RoutineUpdateRequest request
    ) {
        return ResponseEntity.ok(
            RoutineResponse.from(
                routineService.update(
                    loginMember.id(),
                    routineId,
                    request.routineName(),
                    request.routineMemo(),
                    request.isPublic()
                )
            )
        );
    }

    @Operation(summary = "루틴 제품 바꾸기", description = "아침·저녁 제품을 바르는 순서대로 통째로 받아 바꾼다. "
        + "제품 추가·빼기·순서 변경·구간 이동을 모두 이 요청으로 한다. 한 구간에 같은 제품을 두 번 담을 수 없다.")
    @ApiResponse(responseCode = "200", description = "바꾸기 성공")
    @PutMapping("/{routineId}/products")
    public ResponseEntity<RoutineResponse> replaceProducts(
        @AuthenticationPrincipal LoginMember loginMember,
        @PathVariable long routineId,
        @Valid @RequestBody RoutineProductsRequest request
    ) {
        return ResponseEntity.ok(
            RoutineResponse.from(routineService.replaceProducts(loginMember.id(), routineId, request.products()))
        );
    }

    @Operation(summary = "루틴 삭제")
    @ApiResponse(responseCode = "204", description = "삭제 성공")
    @DeleteMapping("/{routineId}")
    public ResponseEntity<Void> delete(
        @AuthenticationPrincipal LoginMember loginMember,
        @PathVariable long routineId
    ) {
        routineService.delete(loginMember.id(), routineId);
        return ResponseEntity.noContent().build();
    }
}
