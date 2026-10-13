package com.poudy.storage.controller;

import com.poudy.security.session.LoginMember;
import com.poudy.storage.controller.dto.SavedProductIdsResponse;
import com.poudy.storage.controller.dto.SavedProductsResponse;
import com.poudy.storage.service.StorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "저장함", description = "로그인한 회원의 저장함 API")
@RestController
@RequestMapping("/api/members/me/saved-products")
public class StorageController {

    private final StorageService storageService;

    public StorageController(StorageService storageService) {
        this.storageService = storageService;
    }

    @Operation(summary = "저장한 제품 ID 조회", description = "제품 목록과 상세에서 저장 여부를 표시할 때 쓴다. 최근에 저장한 것이 앞에 온다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping("/ids")
    public ResponseEntity<SavedProductIdsResponse> findSavedProductIds(
        @AuthenticationPrincipal LoginMember loginMember
    ) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(new SavedProductIdsResponse(storageService.findSavedProductIds(loginMember.id())));
    }

    @Operation(summary = "저장함 조회", description = "저장한 제품을 제품 목록 항목과 같은 정보로 한 번에 조회한다. 최근에 저장한 것이 앞에 온다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping
    public ResponseEntity<SavedProductsResponse> findSavedProducts(@AuthenticationPrincipal LoginMember loginMember) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(SavedProductsResponse.from(storageService.findSavedProducts(loginMember.id())));
    }

    @Operation(summary = "제품 저장", description = "이미 저장한 제품이면 그대로 둔다.")
    @ApiResponse(responseCode = "204", description = "저장 성공")
    @PutMapping("/{productId}")
    public ResponseEntity<Void> save(@AuthenticationPrincipal LoginMember loginMember, @PathVariable long productId) {
        storageService.save(loginMember.id(), productId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "제품 저장 해제", description = "저장하지 않은 제품이어도 성공한다.")
    @ApiResponse(responseCode = "204", description = "저장 해제 성공")
    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> unsave(@AuthenticationPrincipal LoginMember loginMember, @PathVariable long productId) {
        storageService.unsave(loginMember.id(), productId);
        return ResponseEntity.noContent().build();
    }
}
