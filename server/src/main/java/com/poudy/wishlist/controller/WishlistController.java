package com.poudy.wishlist.controller;

import com.poudy.security.session.LoginMember;
import com.poudy.wishlist.controller.dto.WishlistResponse;
import com.poudy.wishlist.service.WishlistService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "위시리스트", description = "로그인한 회원의 위시리스트 API")
@RestController
@RequestMapping("/api/users/me/wishlist")
public class WishlistController {

    private final WishlistService wishlistService;

    public WishlistController(WishlistService wishlistService) {
        this.wishlistService = wishlistService;
    }

    @Operation(summary = "위시리스트 제품 조회", description = "위시리스트 제품 전체를 제품 목록 항목과 같은 정보로 조회한다. "
        + "최근에 담은 것이 앞에 온다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping("/products")
    public ResponseEntity<WishlistResponse> findWishlistProducts(@AuthenticationPrincipal LoginMember loginMember) {
        return ResponseEntity.ok(WishlistResponse.from(wishlistService.findWishlist(loginMember.id())));
    }

    @Operation(summary = "위시리스트 제품 추가", description = "이미 담은 제품이면 그대로 둔다. 뺀 제품을 다시 담으면 지금 담은 것으로 둔다.")
    @ApiResponse(responseCode = "204", description = "추가 성공")
    @PutMapping("/products/{productId}")
    public ResponseEntity<Void> addToWishlist(
        @AuthenticationPrincipal LoginMember loginMember,
        @PathVariable long productId
    ) {
        wishlistService.add(loginMember.id(), productId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "위시리스트 제품 삭제", description = "담지 않은 제품이어도 성공한다.")
    @ApiResponse(responseCode = "204", description = "삭제 성공")
    @DeleteMapping("/products/{productId}")
    public ResponseEntity<Void> removeFromWishlist(
        @AuthenticationPrincipal LoginMember loginMember,
        @PathVariable long productId
    ) {
        wishlistService.remove(loginMember.id(), productId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "위시리스트 제품 되돌리기", description = "뺀 제품을 담았던 시각 그대로 되살려 원래 자리에 둔다. "
        + "이미 담겨 있으면 그대로 둔다.")
    @ApiResponse(responseCode = "204", description = "되돌리기 성공")
    @PostMapping("/products/{productId}/restore")
    public ResponseEntity<Void> restoreToWishlist(
        @AuthenticationPrincipal LoginMember loginMember,
        @PathVariable long productId
    ) {
        wishlistService.restore(loginMember.id(), productId);
        return ResponseEntity.noContent().build();
    }
}
