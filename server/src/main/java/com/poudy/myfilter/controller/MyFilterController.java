package com.poudy.myfilter.controller;

import com.poudy.myfilter.controller.dto.MyFilterIngredientIdsRequest;
import com.poudy.myfilter.controller.dto.MyFilterIngredientsRequest;
import com.poudy.myfilter.controller.dto.MyFilterResponse;
import com.poudy.myfilter.domain.MyFilterIngredient;
import com.poudy.myfilter.service.MyFilterService;
import com.poudy.security.session.LoginMember;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
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
@RequestMapping("/api/users/me/my-filter")
public class MyFilterController {

    private final MyFilterService myFilterService;

    public MyFilterController(MyFilterService myFilterService) {
        this.myFilterService = myFilterService;
    }

    @Operation(summary = "나만의 필터 조회", description = "나만의 필터에 담은 성분을 최근 추가순으로 조회한다.")
    @ApiResponse(responseCode = "200", description = "조회 성공")
    @GetMapping
    public ResponseEntity<MyFilterResponse> findMyFilter(@AuthenticationPrincipal LoginMember loginMember) {
        List<MyFilterIngredient> ingredients = myFilterService.findIngredients(loginMember.id());
        return ResponseEntity.ok(MyFilterResponse.from(ingredients));
    }

    @Operation(summary = "나만의 필터 성분 추가", description = "고른 성분을 더한다. 이미 있는 성분은 그대로 둔다.")
    @ApiResponse(responseCode = "204", description = "추가 성공")
    @PostMapping("/ingredients")
    public ResponseEntity<Void> addIngredients(
        @AuthenticationPrincipal LoginMember loginMember,
        @Valid @RequestBody MyFilterIngredientsRequest request
    ) {
        myFilterService.add(loginMember.id(), request.ingredientIds());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "나만의 필터 성분 삭제", description = "고른 성분을 뺀다. 필터에 없는 성분이어도 성공한다.")
    @ApiResponse(responseCode = "204", description = "삭제 성공")
    @DeleteMapping("/ingredients")
    public ResponseEntity<Void> removeIngredients(
        @AuthenticationPrincipal LoginMember loginMember,
        @Valid @ModelAttribute MyFilterIngredientIdsRequest request
    ) {
        myFilterService.remove(loginMember.id(), request.ingredientIds());
        return ResponseEntity.noContent().build();
    }
}
