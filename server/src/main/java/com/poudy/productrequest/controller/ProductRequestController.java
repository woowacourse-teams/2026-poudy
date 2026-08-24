package com.poudy.productrequest.controller;

import com.poudy.productrequest.controller.dto.ProductRegistrationRequest;
import com.poudy.productrequest.service.ProductRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "제품 등록 요청", description = "검색 결과에 없는 제품의 등록 요청 API")
@RestController
@RequestMapping("/api/product-requests")
public class ProductRequestController {

    private final ProductRequestService productRequestService;

    public ProductRequestController(ProductRequestService productRequestService) {
        this.productRequestService = productRequestService;
    }

    @Operation(summary = "제품 등록 요청 접수", description = "검증한 제품 등록 요청을 운영 검토 대상으로 보관한다. 제품 등록 완료를 뜻하지 않는다.")
    @ApiResponse(responseCode = "202", description = "요청을 보관함")
    @PostMapping
    public ResponseEntity<Void> submit(
            @Valid @RequestBody ProductRegistrationRequest request,
            HttpServletRequest httpRequest) {
        productRequestService.submit(request, httpRequest.getRemoteAddr());
        return ResponseEntity.accepted().build();
    }
}
