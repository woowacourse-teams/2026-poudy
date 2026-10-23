package com.poudy.product.controller;

import com.poudy.product.controller.dto.UserProductResponse;
import com.poudy.product.domain.MyFilteredSimilarProduct;
import com.poudy.product.domain.UnsuitableIngredients;
import com.poudy.product.service.ProductService;
import com.poudy.product.service.ProductSimilarityService;
import com.poudy.security.session.LoginMember;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "제품", description = "제품 조회 API")
@RestController
@RequestMapping("/api/users/me/products")
public class UserProductController {

    private final ProductService productService;
    private final ProductSimilarityService productSimilarityService;

    public UserProductController(ProductService productService, ProductSimilarityService productSimilarityService) {
        this.productService = productService;
        this.productSimilarityService = productSimilarityService;
    }

    @Operation(summary = "회원별 제품 정보 조회", description = "로그인 회원의 제품 하나에 대한 정보를 조회한다. 저장함·선반 저장 여부와 "
        + "partId 로 고른 구성품에 든 나만의 필터 성분과, 같은 구성품 기준 추천 제품마다 나만의 필터 성분이 들었는지를 제공하며 "
        + "응답은 캐시하지 않는다. "
        + "partId 가 없으면 표시 순서가 가장 앞선 구성품을 고른다.")
    @GetMapping("/{productId}")
    public ResponseEntity<UserProductResponse> findUserProduct(
        @AuthenticationPrincipal LoginMember loginMember,
        @Parameter(example = "101") @PathVariable long productId,
        @Parameter(example = "473") @RequestParam(required = false) Long partId
    ) {
        UnsuitableIngredients unsuitable = productService.findUnsuitableIngredients(
            loginMember.id(),
            productId,
            partId
        );
        List<MyFilteredSimilarProduct> similarProducts = productSimilarityService.findMyFiltered(
            loginMember.id(),
            productId,
            partId
        );
        return ResponseEntity.ok(
            UserProductResponse.of(
                productService.isWishlisted(loginMember.id(), productId),
                productService.isShelved(loginMember.id(), productId),
                unsuitable,
                similarProducts
            )
        );
    }
}
