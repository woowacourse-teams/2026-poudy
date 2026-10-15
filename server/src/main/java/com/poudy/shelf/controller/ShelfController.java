package com.poudy.shelf.controller;

import com.poudy.security.session.LoginMember;
import com.poudy.shelf.controller.dto.IngredientAnalysisResponse;
import com.poudy.shelf.controller.dto.ShelfProductAddRequest;
import com.poudy.shelf.controller.dto.ShelfProductIdsResponse;
import com.poudy.shelf.controller.dto.ShelfProductResponse;
import com.poudy.shelf.controller.dto.ShelfProductUpdateRequest;
import com.poudy.shelf.controller.dto.ShelfResponse;
import com.poudy.shelf.domain.IngredientAnalysis;
import com.poudy.shelf.domain.Shelf;
import com.poudy.shelf.domain.ShelfItem;
import com.poudy.shelf.service.ShelfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "선반", description = "로그인한 회원의 선반 API")
@RestController
@RequestMapping("/api/users/me/shelf")
public class ShelfController {

    private final ShelfService shelfService;

    public ShelfController(ShelfService shelfService) {
        this.shelfService = shelfService;
    }

    @Operation(summary = "선반 조회", description = "선반 제품 전부를 최근 등록순으로 조회한다. 사용 상태 탭의 이름과 개수를 함께 준다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping
    public ResponseEntity<ShelfResponse> findShelf(@AuthenticationPrincipal LoginMember loginMember) {
        Shelf shelf = shelfService.findShelf(loginMember.id());
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(ShelfResponse.from(shelf));
    }

    @Operation(summary = "선반 제품 ID 조회", description = "선반에 담은 제품 ID를 최근 등록순으로 조회한다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping("/product-ids")
    public ResponseEntity<ShelfProductIdsResponse> findProductIds(@AuthenticationPrincipal LoginMember loginMember) {
        List<Long> productIds = shelfService.findProductIds(loginMember.id());
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(new ShelfProductIdsResponse(productIds));
    }

    @Operation(summary = "선반 제품 등록", description = "제품을 평가와 함께 선반에 담는다. 평가는 선택이다.")
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
            .cacheControl(CacheControl.noStore())
            .body(ShelfProductResponse.from(addedItem));
    }

    @Operation(summary = "선반 제품 수정", description = "선반 제품의 사용 상태와 평가를 통째로 바꾼다.")
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
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(ShelfProductResponse.from(updatedItem));
    }

    @Operation(summary = "선반 제품 삭제", description = "선반에서 제품을 빼고 평가도 함께 지운다. 선반에 없는 제품이어도 성공한다.")
    @ApiResponse(responseCode = "204", description = "삭제 성공")
    @DeleteMapping("/products/{productId}")
    public ResponseEntity<Void> remove(@AuthenticationPrincipal LoginMember loginMember, @PathVariable long productId) {
        shelfService.remove(loginMember.id(), productId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "성분 분석 조회", description = "안 맞았어요로 평가한 선반 제품의 성분을 분석해 조회한다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping("/ingredient-analysis")
    public ResponseEntity<IngredientAnalysisResponse> analyzeIngredients(
        @AuthenticationPrincipal LoginMember loginMember
    ) {
        IngredientAnalysis analysis = shelfService.analyzeIngredients(loginMember.id());
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(IngredientAnalysisResponse.from(analysis));
    }
}
