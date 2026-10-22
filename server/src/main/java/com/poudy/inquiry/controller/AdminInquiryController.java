package com.poudy.inquiry.controller;

import com.poudy.common.dto.PaginationRequest;
import com.poudy.common.dto.PaginationResponse;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.InvalidRequestException;
import com.poudy.feedback.controller.dto.AdminFeedbackImageResponse;
import com.poudy.feedback.domain.FeedbackStatus;
import com.poudy.feedback.service.FeedbackService;
import com.poudy.inquiry.controller.dto.AdminInquiryPageResponse;
import com.poudy.inquiry.controller.dto.AdminInquiryResponse;
import com.poudy.inquiry.domain.InquiryKind;
import com.poudy.inquiry.domain.InquiryQuery;
import com.poudy.inquiry.service.InquiryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
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

@Tag(name = "관리자 문의")
@RestController
@RequestMapping("/api/admin/inquiries")
public class AdminInquiryController {
    private final InquiryService service;
    private final FeedbackService feedbacks;
    public AdminInquiryController(InquiryService service, FeedbackService feedbacks) {
        this.service = service;
        this.feedbacks = feedbacks;
    }

    @Operation(summary = "문의 통합 목록 조회")
    @GetMapping
    public AdminInquiryPageResponse find(
        @RequestParam(required = false) @Size(max = 200) String q,
        @RequestParam(required = false) FeedbackStatus status,
        @RequestParam(required = false) String type,
        @RequestParam(required = false) Boolean assigned,
        @RequestParam(required = false) OffsetDateTime from,
        @RequestParam(required = false) OffsetDateTime to,
        @RequestParam(defaultValue = "false") boolean oldest,
        @Valid @ModelAttribute PaginationRequest pagination
    ) {
        var query = new InquiryQuery(q, status, type, assigned, from, to, oldest);
        if (from != null && to != null && !from.isBefore(to)) {
            throw new InvalidRequestException(ErrorCode.INVALID_QUERY_PARAMETER);
        }
        return new AdminInquiryPageResponse(
            service.find(query, (long) (pagination.page() - 1) * pagination.size(), pagination.size()).stream()
                .map(AdminInquiryResponse::from).toList(),
            PaginationResponse.of(pagination, service.count(query))
        );
    }

    @Operation(summary = "문의 상태별·오늘 접수 집계 조회")
    @GetMapping("/summary")
    public Summary summary() {
        var s = service.summary();
        return new Summary(
            s.getOrDefault("RECEIVED", 0L),
            s.getOrDefault("IN_PROGRESS", 0L),
            s.getOrDefault("REVIEW_PLANNED", 0L),
            s.getOrDefault("COMPLETED", 0L),
            s.getOrDefault("REJECTED", 0L),
            s.get("TODAY")
        );
    }

    @Operation(summary = "문의 상세 조회")
    @GetMapping("/{kind}/{id}")
    public Detail detail(@PathVariable InquiryKind kind, @PathVariable UUID id) {
        var item = service.detail(kind, id);
        var images = kind == InquiryKind.PRODUCT_REGISTRATION ? List.<AdminFeedbackImageResponse>of()
            : feedbacks.findById(id).images().stream().map(AdminFeedbackImageResponse::from).toList();
        return new Detail(
            AdminInquiryResponse.from(item),
            images
        );
    }

    @Operation(summary = "현재 목록 조건의 이전·다음 문의 조회")
    @GetMapping("/{kind}/{id}/neighbors")
    public Navigation neighbors(
        @PathVariable InquiryKind kind,
        @PathVariable UUID id,
        @ModelAttribute InquiryQuery query
    ) {
        var navigation = service.neighbors(query, kind, id);
        var previous = navigation.previous();
        var next = navigation.next();
        return new Navigation(
            previous == null ? null : new Target(previous.kind(), previous.id()),
            next == null ? null : new Target(next.kind(), next.id()),
            navigation.position(),
            navigation.total()
        );
    }
    @Schema(name = "AdminInquiryNeighborsResponse")
    public record Navigation(
        @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) Target previous,
        @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) Target next,
        @NotNull Long position,
        @NotNull Long total) {
    }

    @Operation(summary = "문의 첨부 이미지 조회")
    @GetMapping("/{kind}/{id}/images/{imageId}")
    public ResponseEntity<byte[]> image(
        @PathVariable InquiryKind kind,
        @PathVariable UUID id,
        @PathVariable UUID imageId
    ) {
        var image = service.image(kind, id, imageId);
        return ResponseEntity.ok().cacheControl(org.springframework.http.CacheControl.noStore())
            .contentType(org.springframework.http.MediaType.parseMediaType(image.contentType())).body(image.bytes());
    }

    @Operation(summary = "문의 처리 상태 변경")
    @PatchMapping("/{kind}/{id}/status")
    public ResponseEntity<Void> status(
        @PathVariable InquiryKind kind,
        @PathVariable UUID id,
        @Valid @RequestBody Status request
    ) {
        service.status(List.of(new InquiryService.Target(kind, id)), request.status());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "문의 담당자 변경")
    @PatchMapping("/{kind}/{id}/assignee")
    public ResponseEntity<Void> assign(
        @PathVariable InquiryKind kind,
        @PathVariable UUID id,
        @Valid @RequestBody Assignee request
    ) {
        service.assign(List.of(new InquiryService.Target(kind, id)), request.assigned());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "여러 문의의 처리 상태 변경")
    @PatchMapping("/status")
    public ResponseEntity<Void> bulkStatus(@Valid @RequestBody BulkStatus request) {
        service.status(request.targets().stream().map(Target::domain).toList(), request.status());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "여러 문의의 담당자 변경")
    @PatchMapping("/assignee")
    public ResponseEntity<Void> bulkAssign(@Valid @RequestBody BulkAssignee request) {
        service.assign(request.targets().stream().map(Target::domain).toList(), request.assigned());
        return ResponseEntity.noContent().build();
    }
    @Schema(name = "AdminInquirySummaryResponse")
    public record Summary(
        @NotNull Long received,
        @NotNull Long inProgress,
        @NotNull Long reviewPlanned,
        @NotNull Long completed,
        @NotNull Long rejected,
        @NotNull Long today) {
    }

    @Schema(name = "AdminInquiryDetailResponse")
    public record Detail(
        @NotNull AdminInquiryResponse inquiry,
        @NotNull List<AdminFeedbackImageResponse> images) {
    }

    public record Status(@NotNull FeedbackStatus status) {
    }

    public record Assignee(@NotNull Boolean assigned) {
    }

    @Schema(name = "AdminInquiryTarget")
    public record Target(@NotNull InquiryKind kind, @NotNull UUID id) {
        InquiryService.Target domain() {
            return new InquiryService.Target(kind, id);
        }
    }

    public record BulkStatus(
        @NotNull @Size(min = 1, max = 100) List<@NotNull @Valid Target> targets,
        @NotNull FeedbackStatus status) {
    }

    public record BulkAssignee(
        @NotNull @Size(min = 1, max = 100) List<@NotNull @Valid Target> targets,
        @NotNull Boolean assigned) {
    }
}
