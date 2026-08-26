package com.poudy.feedback.controller;

import com.poudy.common.web.ClientAddressResolver;
import com.poudy.feedback.controller.dto.FeedbackImageUploadResponse;
import com.poudy.feedback.controller.dto.FeedbackRequest;
import com.poudy.feedback.service.FeedbackImageUploadService;
import com.poudy.feedback.service.FeedbackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "피드백", description = "사용자 피드백 등록 API")
@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    private final FeedbackService feedbackService;
    private final FeedbackImageUploadService imageUploadService;

    public FeedbackController(
            FeedbackService feedbackService,
            FeedbackImageUploadService imageUploadService) {
        this.feedbackService = feedbackService;
        this.imageUploadService = imageUploadService;
    }

    @Operation(summary = "의견 등록", description = "의견과 작성 화면 경로를 S3에 저장하고 Discord로 알린다.")
    @ApiResponse(responseCode = "204", description = "의견 등록 완료")
    @PostMapping
    public ResponseEntity<Void> submit(
            @Valid @RequestBody FeedbackRequest request,
            HttpServletRequest httpRequest) {
        feedbackService.submit(
                request.type(),
                request.content(),
                request.path(),
                request.imageIds(),
                ClientAddressResolver.resolve(httpRequest));

        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "의견 이미지 업로드", description = "이미지를 검증·재인코딩해 24시간 동안 임시 저장한다.")
    @ApiResponse(responseCode = "201", description = "이미지 업로드 완료")
    @PostMapping(path = "/images", consumes = "multipart/form-data")
    public ResponseEntity<FeedbackImageUploadResponse> uploadImages(
            @RequestPart("images") List<MultipartFile> images,
            HttpServletRequest httpRequest) {
        List<java.util.UUID> imageIds = imageUploadService.upload(
                images,
                ClientAddressResolver.resolve(httpRequest));
        return ResponseEntity.status(201).body(new FeedbackImageUploadResponse(imageIds));
    }
}
