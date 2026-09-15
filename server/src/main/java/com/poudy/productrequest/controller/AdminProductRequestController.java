package com.poudy.productrequest.controller;

import com.poudy.common.dto.PaginationRequest;
import com.poudy.common.dto.PaginationResponse;
import com.poudy.productrequest.domain.ProductRequest;
import com.poudy.productrequest.domain.ProductRequestStatus;
import com.poudy.productrequest.service.ProductRequestService;
import com.poudy.productrequest.service.ProductRequestService.ProductRequestPage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
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

@Tag(name = "관리자 제품 등록 요청", description = "제품 등록 요청 조회 및 처리 상태 관리 API")
@RestController
@RequestMapping("/api/admin/product-requests")
public class AdminProductRequestController {

    private final ProductRequestService productRequestService;

    public AdminProductRequestController(ProductRequestService productRequestService) {
        this.productRequestService = productRequestService;
    }

    @Operation(summary = "제품 등록 요청 목록 조회")
    @ApiResponse(responseCode = "200", description = "제품 등록 요청 목록 조회 성공")
    @GetMapping
    public ResponseEntity<AdminProductRequestPageResponse> findAll(
        @RequestParam(required = false) ProductRequestStatus status,
        @Valid @ModelAttribute PaginationRequest pagination
    ) {
        return ResponseEntity.ok(
            AdminProductRequestPageResponse.from(
                productRequestService.findAll(status, pagination.page(), pagination.size()),
                pagination
            )
        );
    }

    @Operation(summary = "제품 등록 요청 상세 조회")
    @ApiResponse(responseCode = "200", description = "제품 등록 요청 상세 조회 성공")
    @GetMapping("/{requestId}")
    public ResponseEntity<AdminProductRequestResponse> findById(@PathVariable UUID requestId) {
        return ResponseEntity.ok(AdminProductRequestResponse.from(productRequestService.findById(requestId)));
    }

    @Operation(summary = "제품 등록 요청 처리 상태 변경")
    @ApiResponse(responseCode = "200", description = "제품 등록 요청 처리 상태 변경 성공")
    @PatchMapping("/{requestId}/status")
    public ResponseEntity<AdminProductRequestResponse> changeStatus(
        @PathVariable UUID requestId,
        @Valid @RequestBody AdminProductRequestStatusUpdateRequest request
    ) {
        return ResponseEntity.ok(
            AdminProductRequestResponse.from(productRequestService.changeStatus(requestId, request.status()))
        );
    }

    public record AdminProductRequestStatusUpdateRequest(
        @NotNull(message = "INVALID_REQUEST_BODY") @Schema(example = "IN_PROGRESS") ProductRequestStatus status) {
    }

    public record AdminProductRequestPageResponse(
        @NotNull List<AdminProductRequestResponse> items,
        @NotNull PaginationResponse pagination) {

        static AdminProductRequestPageResponse from(ProductRequestPage page, PaginationRequest pagination) {
            return new AdminProductRequestPageResponse(
                page.items().stream().map(AdminProductRequestResponse::from).toList(),
                PaginationResponse.of(pagination, page.totalElements())
            );
        }
    }

    public record AdminProductRequestResponse(
        @NotNull UUID requestId,
        @NotNull String productName,
        @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String brandName,
        @NotNull OffsetDateTime requestedAt,
        @NotNull ProductRequestStatus status,
        @NotNull OffsetDateTime statusChangedAt,
        @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) OffsetDateTime completedAt) {

        static AdminProductRequestResponse from(ProductRequest request) {
            return new AdminProductRequestResponse(
                request.requestId(),
                request.productName(),
                request.brandName(),
                request.requestedAt(),
                request.status(),
                request.statusChangedAt(),
                request.completedAt()
            );
        }
    }
}
