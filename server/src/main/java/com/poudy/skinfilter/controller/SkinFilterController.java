package com.poudy.skinfilter.controller;

import com.poudy.ingredient.domain.Ingredients;
import com.poudy.security.session.LoginMember;
import com.poudy.skinfilter.controller.dto.SkinFilterIngredientIdsRequest;
import com.poudy.skinfilter.controller.dto.SkinFilterIngredientsRequest;
import com.poudy.skinfilter.controller.dto.SkinFilterResponse;
import com.poudy.skinfilter.service.SkinFilterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "나만의 필터", description = "로그인한 회원의 나만의 필터 API")
@RestController
@RequestMapping("/api/users/me/skin-filter")
public class SkinFilterController {

    private final SkinFilterService skinFilterService;

    public SkinFilterController(SkinFilterService skinFilterService) {
        this.skinFilterService = skinFilterService;
    }

    @Operation(summary = "나만의 필터 조회", description = "나만의 필터에 담은 성분을 최근 추가순으로 조회한다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping
    public ResponseEntity<SkinFilterResponse> findSkinFilter(@AuthenticationPrincipal LoginMember loginMember) {
        Ingredients ingredients = skinFilterService.findIngredients(loginMember.id());
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(SkinFilterResponse.from(ingredients));
    }

    @Operation(summary = "나만의 필터 성분 추가", description = "고른 성분을 더한다. 이미 있는 성분은 그대로 둔다.")
    @ApiResponse(responseCode = "204", description = "추가 성공")
    @PostMapping("/ingredients")
    public ResponseEntity<Void> addIngredients(
        @AuthenticationPrincipal LoginMember loginMember,
        @Valid @RequestBody SkinFilterIngredientsRequest request
    ) {
        skinFilterService.add(loginMember.id(), request.ingredientIds());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "나만의 필터 성분 삭제", description = "고른 성분을 뺀다. 필터에 없는 성분이어도 성공한다.")
    @ApiResponse(responseCode = "204", description = "삭제 성공")
    @DeleteMapping("/ingredients")
    public ResponseEntity<Void> removeIngredients(
        @AuthenticationPrincipal LoginMember loginMember,
        @Valid @ModelAttribute SkinFilterIngredientIdsRequest request
    ) {
        skinFilterService.remove(loginMember.id(), request.ingredientIds());
        return ResponseEntity.noContent().build();
    }
}
