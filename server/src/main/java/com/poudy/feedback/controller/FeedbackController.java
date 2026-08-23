package com.poudy.feedback.controller;

import com.poudy.feedback.controller.dto.FeedbackRequest;
import com.poudy.feedback.service.FeedbackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "피드백", description = "사용자 피드백 등록 API")
@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    private final FeedbackService feedbackService;

    public FeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @Operation(summary = "의견 등록", description = "의견과 작성 화면 경로를 S3에 저장하고 Discord로 알린다.")
    @ApiResponse(responseCode = "204", description = "의견 등록 완료")
    @PostMapping
    public ResponseEntity<Void> submit(@Valid @RequestBody FeedbackRequest request) {
        feedbackService.submit(request.type(), request.content(), request.path());

        return ResponseEntity.noContent().build();
    }
}
