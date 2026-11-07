package com.poudy.routine.controller;

import com.poudy.common.dto.PaginationRequest;
import com.poudy.routine.controller.dto.RoutineCommentPageResponse;
import com.poudy.routine.controller.dto.SharedRoutineDetailResponse;
import com.poudy.routine.controller.dto.SharedRoutinePageResponse;
import com.poudy.routine.domain.SharedRoutineSort;
import com.poudy.routine.service.RoutineReactionService;
import com.poudy.routine.service.RoutineService;
import com.poudy.security.session.LoginMember;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "공개 루틴", description = "로그인 없이 보는 공개 루틴 API")
@RestController
@RequestMapping("/api/routines")
public class SharedRoutineController {

    private static final int COMMENT_PREVIEW_SIZE = 2;

    private final RoutineService routineService;
    private final RoutineReactionService reactionService;

    public SharedRoutineController(RoutineService routineService, RoutineReactionService reactionService) {
        this.routineService = routineService;
        this.reactionService = reactionService;
    }

    @Operation(summary = "루틴 둘러보기", description = "제품이 하나 이상인 공개 루틴을 고른 순서로 조회한다. 탈퇴한 회원의 루틴은 뺀다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping
    public ResponseEntity<SharedRoutinePageResponse> findShared(
        @Parameter(example = "LATEST") @RequestParam(defaultValue = "LATEST") SharedRoutineSort sort,
        @Valid @ModelAttribute PaginationRequest pagination
    ) {
        return ResponseEntity.ok(
            SharedRoutinePageResponse.from(
                routineService.findSharedPage(sort, pagination.page(), pagination.size()),
                pagination
            )
        );
    }

    @Operation(summary = "공개 루틴 상세 조회", description = "메모와 함께 조회한다. 제품이 없어도 열린다. 비공개 루틴과 없는 루틴은 404다. "
        + "로그인했으면 좋아요 여부를 주고, 앞의 댓글 두 개를 미리 보여 준다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping("/{routineId}")
    public ResponseEntity<SharedRoutineDetailResponse> findShared(
        @AuthenticationPrincipal LoginMember loginMember,
        @PathVariable long routineId
    ) {
        Long viewerId = viewerIdOf(loginMember);
        return ResponseEntity.ok(
            SharedRoutineDetailResponse.from(
                routineService.findShared(routineId),
                reactionService.isLiked(viewerId, routineId),
                reactionService.findComments(routineId, viewerId, 1, COMMENT_PREVIEW_SIZE)
            )
        );
    }

    @Operation(summary = "루틴 댓글 조회", description = "공개 루틴의 댓글을 오래된 순으로 조회한다. 작성자는 비공개로 바꾼 루틴의 댓글도 본다. "
        + "탈퇴한 회원의 댓글은 뺀다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping("/{routineId}/comments")
    public ResponseEntity<RoutineCommentPageResponse> findComments(
        @AuthenticationPrincipal LoginMember loginMember,
        @PathVariable long routineId,
        @Valid @ModelAttribute PaginationRequest pagination
    ) {
        return ResponseEntity.ok(
            RoutineCommentPageResponse.from(
                reactionService.findComments(routineId, viewerIdOf(loginMember), pagination.page(), pagination.size()),
                pagination
            )
        );
    }

    private static Long viewerIdOf(LoginMember loginMember) {
        if (loginMember == null) {
            return null;
        }
        return loginMember.id();
    }
}
