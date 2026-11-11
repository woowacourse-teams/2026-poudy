package com.poudy.shelf.controller;

import com.poudy.common.dto.KeywordRequest;
import com.poudy.common.dto.PaginationRequest;
import com.poudy.product.service.ProductService;
import com.poudy.security.session.LoginMember;
import com.poudy.shelf.controller.dto.IngredientAnalysisPreviewRequest;
import com.poudy.shelf.controller.dto.IngredientAnalysisPreviewResponse;
import com.poudy.shelf.controller.dto.IngredientAnalysisResponse;
import com.poudy.shelf.controller.dto.ShelfProductAddRequest;
import com.poudy.shelf.controller.dto.ShelfProductResponse;
import com.poudy.shelf.controller.dto.ShelfProductSuggestionPageResponse;
import com.poudy.shelf.controller.dto.ShelfProductUpdateRequest;
import com.poudy.shelf.controller.dto.ShelfResponse;
import com.poudy.shelf.domain.IngredientAnalysis;
import com.poudy.shelf.domain.Shelf;
import com.poudy.shelf.domain.ShelfItem;
import com.poudy.shelf.domain.ShelfRatingPreview;
import com.poudy.shelf.service.ShelfService;
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

@Tag(name = "파우치", description = "로그인한 회원의 파우치 API")
@RestController
@RequestMapping("/api/users/me/shelf")
public class ShelfController {

    private final ShelfService shelfService;
    private final ProductService productService;

    public ShelfController(ShelfService shelfService, ProductService productService) {
        this.shelfService = shelfService;
        this.productService = productService;
    }

    @Operation(summary = "파우치에 추가할 제품 검색 제안", description = "로그인한 회원에게 제품명·브랜드명 검색 제안을 페이지 단위로 제공한다. "
        + "기존 GET /api/products/suggestions와 요청·검색 규칙이 같고, 응답에 sensorySupported를 더한다. "
        + "match는 일치한 원문과 UTF-16 반열림 구간이며 pagination.totalElements는 전체 제안 제품 수다.")
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

    @Operation(summary = "파우치 제품 조회", description = "파우치 제품 전부를 최근 등록순으로 조회한다. 사용 상태 탭의 이름과 개수를 함께 준다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping("/products")
    public ResponseEntity<ShelfResponse> findShelfProducts(@AuthenticationPrincipal LoginMember loginMember) {
        Shelf shelf = shelfService.findShelf(loginMember.id());
        return ResponseEntity.ok(ShelfResponse.from(shelf));
    }

    @Operation(summary = "파우치 제품 등록", description = "제품을 평가와 함께 파우치에 담는다. 평가는 선택이다. "
        + "뺀 제품을 다시 담으면 지금 담은 것으로 새로 쓴다.")
    @ApiResponse(responseCode = "201", description = "등록 성공")
    @PostMapping("/products")
    public ResponseEntity<ShelfProductResponse> add(
        @AuthenticationPrincipal LoginMember loginMember,
        @Valid @RequestBody ShelfProductAddRequest request
    ) {
        ShelfItem addedItem = shelfService.add(
            loginMember.id(),
            request.productId(),
            request.usageStatus(),
            request.rating()
        );
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ShelfProductResponse.from(addedItem));
    }

    @Operation(summary = "파우치 제품 수정", description = "파우치 제품의 사용 상태와 평가를 통째로 바꾼다.")
    @ApiResponse(responseCode = "200", description = "수정 성공")
    @PutMapping("/products/{productId}")
    public ResponseEntity<ShelfProductResponse> update(
        @AuthenticationPrincipal LoginMember loginMember,
        @PathVariable long productId,
        @Valid @RequestBody ShelfProductUpdateRequest request
    ) {
        ShelfItem updatedItem = shelfService.update(
            loginMember.id(),
            productId,
            request.usageStatus(),
            request.rating()
        );
        return ResponseEntity.ok(ShelfProductResponse.from(updatedItem));
    }

    @Operation(summary = "파우치 제품 삭제", description = "파우치에서 제품을 뺀다. 파우치에 없는 제품이어도 성공한다.")
    @ApiResponse(responseCode = "204", description = "삭제 성공")
    @DeleteMapping("/products/{productId}")
    public ResponseEntity<Void> remove(@AuthenticationPrincipal LoginMember loginMember, @PathVariable long productId) {
        shelfService.remove(loginMember.id(), productId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "파우치 제품 되돌리기", description = "뺀 제품을 사용 상태와 평가, 담은 시각 그대로 되살린다. "
        + "이미 파우치에 있으면 그대로 둔다.")
    @ApiResponse(responseCode = "204", description = "되돌리기 성공")
    @PostMapping("/products/{productId}/restore")
    public ResponseEntity<Void> restoreToShelf(
        @AuthenticationPrincipal LoginMember loginMember,
        @PathVariable long productId
    ) {
        shelfService.restore(loginMember.id(), productId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "성분 분석 조회", description = "안 맞았어요로 평가한 파우치 제품의 성분을 분석해 조회한다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping("/ingredient-analysis")
    public ResponseEntity<IngredientAnalysisResponse> analyzeIngredients(
        @AuthenticationPrincipal LoginMember loginMember
    ) {
        IngredientAnalysis analysis = shelfService.analyzeIngredients(loginMember.id());
        return ResponseEntity.ok(IngredientAnalysisResponse.from(analysis));
    }

    @Operation(summary = "파우치 평가 미리보기", description = "저장된 파우치에서 이 제품의 호불호만 평가 없음·잘 맞았어요·안 맞았어요로 바꿔 성분 분석을 계산한다. "
        + "파우치에 없는 제품이면 담았다고 가정한다. 아무것도 저장하지 않는다. "
        + "ratedBadAcrossSkinTypes는 피부 타입을 넣지 않은 회원에게만 건성·지성·민감성 주의 성분까지 후보로 넓혀 계산한 안 맞았어요 결과이고, 그 밖에는 null이다. "
        + "productCautionIngredients는 이 제품에 든 주의 성분과 근거다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping("/ingredient-analysis/preview")
    public ResponseEntity<IngredientAnalysisPreviewResponse> previewIngredientAnalysis(
        @AuthenticationPrincipal LoginMember loginMember,
        @Valid @ModelAttribute IngredientAnalysisPreviewRequest request
    ) {
        ShelfRatingPreview preview = shelfService.previewRating(loginMember.id(), request.productId());
        return ResponseEntity.ok(IngredientAnalysisPreviewResponse.from(preview));
    }
}
