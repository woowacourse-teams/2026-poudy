package com.poudy.feedback.controller;

import com.poudy.common.web.ClientAddressResolver;
import com.poudy.feedback.controller.dto.FeedbackImageUploadResponse;
import com.poudy.feedback.controller.dto.FeedbackRequest;
import com.poudy.feedback.controller.dto.ProductCorrectionRequest;
import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.service.FeedbackImageUploadService;
import com.poudy.feedback.service.FeedbackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "피드백", description = "사용자 피드백 등록 API")
@RestController
public class FeedbackController {

    private final FeedbackService feedbackService;
    private final FeedbackImageUploadService imageUploadService;

    public FeedbackController(
        FeedbackService feedbackService,
        FeedbackImageUploadService imageUploadService
    ) {
        this.feedbackService = feedbackService;
        this.imageUploadService = imageUploadService;
    }

    @Operation(summary = "의견 등록", description = "의견과 작성 화면 경로를 DB에 저장하고 Discord로 알린다.")
    @ApiResponse(responseCode = "204", description = "의견 등록 완료")
    @PostMapping("/api/feedbacks")
    public ResponseEntity<Void> submit(
        @Valid @RequestBody FeedbackRequest request,
        HttpServletRequest httpRequest
    ) {
        feedbackService.submit(
            request.type(),
            request.content(),
            request.path(),
            request.imageIds(),
            ClientAddressResolver.resolve(httpRequest)
        );

        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "제품 정보 정정 요청", description = "존재하는 제품의 정보 정정 요청을 DB에 저장하고 Discord로 알린다.")
    @ApiResponse(responseCode = "204", description = "정정 요청 접수 완료")
    @PostMapping("/api/products/{productId}/correction-requests")
    public ResponseEntity<Void> submitProductCorrection(
        @Parameter(example = "101") @PathVariable Long productId,
        @Valid @RequestBody ProductCorrectionRequest request,
        HttpServletRequest httpRequest
    ) {
        feedbackService.submitProductCorrection(
            productId,
            request.content(),
            request.imageIds(),
            ClientAddressResolver.resolve(httpRequest)
        );

        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "임시 이미지 업로드", description = "JPEG, PNG, HEIC 이미지를 검증·재인코딩해 24시간 동안 임시 저장한다. HEIC는 JPEG로 저장한다.")
    @ApiResponse(responseCode = "201", description = "이미지 업로드 완료")
    @PostMapping(path = "/api/pending-images", consumes = "multipart/form-data")
    public ResponseEntity<FeedbackImageUploadResponse> uploadImages(
        @ArraySchema(minItems = 1, maxItems = Feedback.MAX_IMAGE_COUNT) @RequestPart("images") List<MultipartFile> images,
        HttpServletRequest httpRequest
    ) {
        List<java.util.UUID> imageIds = imageUploadService.upload(
            images,
            ClientAddressResolver.resolve(httpRequest)
        );
        return ResponseEntity.status(201).body(new FeedbackImageUploadResponse(imageIds));
    }
}
