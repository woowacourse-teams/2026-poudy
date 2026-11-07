package com.poudy.shelf.controller;

import com.poudy.common.dto.KeywordRequest;
import com.poudy.common.dto.PaginationRequest;
import com.poudy.product.service.ProductService;
import com.poudy.shelf.controller.dto.GuestIngredientAnalysisPreviewRequest;
import com.poudy.shelf.controller.dto.GuestIngredientAnalysisRequest;
import com.poudy.shelf.controller.dto.GuestIngredientAnalysisResponse;
import com.poudy.shelf.controller.dto.IngredientAnalysisPreviewResponse;
import com.poudy.shelf.controller.dto.ShelfProductSuggestionPageResponse;
import com.poudy.shelf.domain.GuestIngredientAnalysis;
import com.poudy.shelf.domain.ShelfRatingPreview;
import com.poudy.shelf.service.ShelfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "파우치")
@RestController
@RequestMapping("/api/shelf")
public class GuestShelfController {

    private final ShelfService shelfService;
    private final ProductService productService;

    public GuestShelfController(ShelfService shelfService, ProductService productService) {
        this.shelfService = shelfService;
        this.productService = productService;
    }

    @Operation(summary = "비로그인 성분 분석", description = "비로그인 사용자가 브라우저에 둔 파우치 제품의 평가로 성분 분석을 계산한다. "
        + "아무것도 저장하지 않는다. 나만의 필터가 없어 inFilter·isNew는 늘 false다. 피부 정보가 없어 빠른 제외 성분과 건성·지성·민감성 주의 성분을 모두 후보로 두고, reasons로 근거를 나눈다. "
        + "possiblyUnsuitableProductIds는 보낸 제품 가운데 안 맞을 수 있는 성분이 든 제품이다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @PostMapping("/ingredient-analysis")
    public ResponseEntity<GuestIngredientAnalysisResponse> analyzeGuestIngredients(
        @Valid @RequestBody GuestIngredientAnalysisRequest request
    ) {
        GuestIngredientAnalysis analysis = shelfService.analyzeGuestIngredients(request.ratings());
        return ResponseEntity.ok(GuestIngredientAnalysisResponse.from(analysis));
    }

    @Operation(summary = "비로그인 평가 미리보기", description = "브라우저에 둔 파우치 제품의 평가에서 productId 제품의 호불호만 평가 없음·잘 맞았어요·안 맞았어요로 바꿔 성분 분석을 계산한다. "
        + "items에 같은 제품이 있으면 그 호불호는 무시한다. 아무것도 저장하지 않는다. 비로그인 성분 분석과 같은 규칙으로 계산하며 ratedBadAcrossSkinTypes는 늘 null이다. "
        + "productCautionIngredients는 이 제품에 든 빠른 제외·건성·지성·민감성 주의 성분과 근거다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @PostMapping("/ingredient-analysis/preview")
    public ResponseEntity<IngredientAnalysisPreviewResponse> previewGuestIngredientAnalysis(
        @Valid @RequestBody GuestIngredientAnalysisPreviewRequest request
    ) {
        ShelfRatingPreview preview = shelfService.previewGuestRating(request.ratings(), request.productId());
        return ResponseEntity.ok(IngredientAnalysisPreviewResponse.from(preview));
    }

    @Operation(summary = "파우치에 추가할 제품 검색 제안", description = "로그인하지 않아도 쓸 수 있는 파우치 제품 검색 제안이다. "
        + "GET /api/users/me/shelf/product-suggestions와 요청·응답이 같다.")
    @GetMapping("/product-suggestions")
    public ResponseEntity<ShelfProductSuggestionPageResponse> suggestShelfProducts(
        @Valid @ModelAttribute KeywordRequest search,
        @Valid @ModelAttribute PaginationRequest pagination
    ) {
        return ResponseEntity.ok(
            ShelfProductSuggestionPageResponse.from(
                productService.suggestProducts(search.keyword(), pagination.page(), pagination.size()),
                pagination
            )
        );
    }
}
