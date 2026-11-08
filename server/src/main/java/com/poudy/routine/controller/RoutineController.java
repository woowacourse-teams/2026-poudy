package com.poudy.routine.controller;

import com.poudy.common.dto.PaginationRequest;
import com.poudy.routine.controller.dto.RoutineCommentRequest;
import com.poudy.routine.controller.dto.RoutineCommentResponse;
import com.poudy.routine.controller.dto.RoutineCreateRequest;
import com.poudy.routine.controller.dto.RoutineImportRequest;
import com.poudy.routine.controller.dto.RoutinePageResponse;
import com.poudy.routine.controller.dto.RoutineProductsRequest;
import com.poudy.routine.controller.dto.RoutineResponse;
import com.poudy.routine.controller.dto.RoutineUpdateRequest;
import com.poudy.routine.service.RoutineReactionService;
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
import org.springframework.web.bind.annotation.ModelAttribute;
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
    private final RoutineReactionService reactionService;
    private final RoutineAnalytics analytics;

    public RoutineController(
        RoutineService routineService,
        RoutineReactionService reactionService,
        RoutineAnalytics analytics
    ) {
        this.routineService = routineService;
        this.reactionService = reactionService;
        this.analytics = analytics;
    }

    @Operation(summary = "루틴 만들기", description = "아침·저녁 제품은 선택이며 바르는 순서대로 보낸다. "
        + "한 구간에 같은 제품을 두 번 담을 수 없고, 아침과 저녁에는 같은 제품을 담을 수 있다.")
    @ApiResponse(responseCode = "201", description = "만들기 성공")
    @PostMapping
    public ResponseEntity<RoutineResponse> create(
        @AuthenticationPrincipal LoginMember loginMember,
        @Valid @RequestBody RoutineCreateRequest request
    ) {
        RoutineResponse response = RoutineResponse.from(
            routineService.create(
                loginMember.id(),
                request.routineName(),
                request.routineMemo(),
                request.isPublic(),
                request.products()
            )
        );
        analytics.committed(loginMember.id(), "create", response);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(summary = "공개 루틴 가져오기", description = "공개 루틴의 아침·저녁 제품과 순서를 그대로 복사해 내 루틴으로 만든다. "
        + "이름은 '원작성자 닉네임 - 원래 이름'을 25자로 자른 것이고, 메모는 복사하지 않으며 비공개로 만든다.")
    @ApiResponse(responseCode = "201", description = "가져오기 성공")
    @PostMapping("/imports")
    public ResponseEntity<RoutineResponse> importRoutine(
        @AuthenticationPrincipal LoginMember loginMember,
        @Valid @RequestBody RoutineImportRequest request
    ) {
        RoutineResponse response = RoutineResponse
            .from(routineService.importRoutine(loginMember.id(), request.routineId()));
        analytics.committed(loginMember.id(), "import", response);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(summary = "내 루틴 목록 조회", description = "내 루틴을 최근 만든 순으로 페이지 단위로 조회한다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping
    public ResponseEntity<RoutinePageResponse> findMine(
        @AuthenticationPrincipal LoginMember loginMember,
        @Valid @ModelAttribute PaginationRequest pagination
    ) {
        return ResponseEntity.ok(
            RoutinePageResponse.from(
                routineService.findMinePage(loginMember.id(), pagination.page(), pagination.size()),
                pagination
            )
        );
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
        RoutineResponse response = RoutineResponse
            .from(routineService.replaceProducts(loginMember.id(), routineId, request.products()));
        analytics.committed(loginMember.id(), "products", response);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "루틴 좋아요", description = "공개 루틴에 좋아요를 누른다. 이미 눌렀으면 그대로 둔다.")
    @ApiResponse(responseCode = "204", description = "좋아요 성공")
    @PutMapping("/{routineId}/like")
    public ResponseEntity<Void> like(@AuthenticationPrincipal LoginMember loginMember, @PathVariable long routineId) {
        reactionService.like(loginMember.id(), routineId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "루틴 좋아요 취소", description = "누르지 않았어도 성공한다.")
    @ApiResponse(responseCode = "204", description = "취소 성공")
    @DeleteMapping("/{routineId}/like")
    public ResponseEntity<Void> unlike(@AuthenticationPrincipal LoginMember loginMember, @PathVariable long routineId) {
        reactionService.unlike(loginMember.id(), routineId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "루틴 댓글 쓰기", description = "공개 루틴에 댓글을 쓴다. 답글은 없다.")
    @ApiResponse(responseCode = "201", description = "작성 성공")
    @PostMapping("/{routineId}/comments")
    public ResponseEntity<RoutineCommentResponse> writeComment(
        @AuthenticationPrincipal LoginMember loginMember,
        @PathVariable long routineId,
        @Valid @RequestBody RoutineCommentRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
            RoutineCommentResponse.from(
                reactionService.writeComment(loginMember.id(), routineId, request.commentContent())
            )
        );
    }

    @Operation(summary = "루틴 댓글 수정", description = "내가 쓴 댓글의 내용을 바꾼다. 남의 댓글이나 없는 댓글, 비공개가 된 루틴의 댓글은 404다.")
    @ApiResponse(responseCode = "200", description = "수정 성공")
    @PutMapping("/comments/{commentId}")
    public ResponseEntity<RoutineCommentResponse> editComment(
        @AuthenticationPrincipal LoginMember loginMember,
        @PathVariable long commentId,
        @Valid @RequestBody RoutineCommentRequest request
    ) {
        return ResponseEntity.ok(
            RoutineCommentResponse.from(
                reactionService.editComment(loginMember.id(), commentId, request.commentContent())
            )
        );
    }

    @Operation(summary = "루틴 댓글 삭제", description = "내가 쓴 댓글만 지운다. 남의 댓글이나 없는 댓글은 404다.")
    @ApiResponse(responseCode = "204", description = "삭제 성공")
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
        @AuthenticationPrincipal LoginMember loginMember,
        @PathVariable long commentId
    ) {
        reactionService.deleteComment(loginMember.id(), commentId);
        return ResponseEntity.noContent().build();
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
