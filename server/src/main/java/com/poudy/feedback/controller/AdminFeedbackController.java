package com.poudy.feedback.controller;

import com.poudy.common.dto.PaginationRequest;
import com.poudy.feedback.controller.dto.AdminFeedbackPageResponse;
import com.poudy.feedback.controller.dto.AdminFeedbackResponse;
import com.poudy.feedback.controller.dto.AdminFeedbackStatusUpdateRequest;
import com.poudy.feedback.domain.FeedbackStatus;
import com.poudy.feedback.domain.FeedbackSubjectType;
import com.poudy.feedback.service.FeedbackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관리자 피드백", description = "피드백 조회 및 처리 상태 관리 API")
@RestController
@RequestMapping("/api/admin/feedbacks")
public class AdminFeedbackController {

    private final FeedbackService feedbackService;

    public AdminFeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @Operation(summary = "피드백 목록 조회")
    @ApiResponse(responseCode = "200", description = "피드백 목록 조회 성공")
    @GetMapping
    public ResponseEntity<AdminFeedbackPageResponse> findAll(
        @RequestParam(required = false) FeedbackStatus status,
        @RequestParam(required = false) FeedbackSubjectType type,
        @Valid @ModelAttribute PaginationRequest pagination
    ) {
        return ResponseEntity.ok(
            AdminFeedbackPageResponse.from(
                feedbackService.findAll(status, type, pagination.page(), pagination.size()),
                pagination
            )
        );
    }

    @Operation(summary = "피드백 상세 조회")
    @ApiResponse(responseCode = "200", description = "피드백 상세 조회 성공")
    @GetMapping("/{feedbackId}")
    public ResponseEntity<AdminFeedbackResponse> findById(@PathVariable UUID feedbackId) {
        return ResponseEntity.ok(AdminFeedbackResponse.from(feedbackService.findById(feedbackId)));
    }

    @Operation(summary = "피드백 처리 상태 변경")
    @ApiResponse(responseCode = "200", description = "피드백 처리 상태 변경 성공")
    @PatchMapping("/{feedbackId}/status")
    public ResponseEntity<AdminFeedbackResponse> changeStatus(
        @PathVariable UUID feedbackId,
        @Valid @RequestBody AdminFeedbackStatusUpdateRequest request
    ) {
        return ResponseEntity.ok(
            AdminFeedbackResponse.from(feedbackService.changeStatus(feedbackId, request.status()))
        );
    }
}
