package com.poudy.product.controller;

import com.poudy.product.controller.dto.UserProductResponse;
import com.poudy.product.service.ProductService;
import com.poudy.security.session.LoginMember;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "제품", description = "제품 조회 API")
@RestController
@RequestMapping("/api/users/me/products")
public class UserProductController {

    private final ProductService productService;

    public UserProductController(ProductService productService) {
        this.productService = productService;
    }

    @Operation(summary = "회원별 제품 정보 조회", description = "로그인 회원의 제품 하나에 대한 정보를 조회한다. 현재는 저장함·선반 저장 여부를 제공하며 응답은 캐시하지 않는다.")
    @GetMapping("/{productId}")
    public ResponseEntity<UserProductResponse> findUserProduct(
        @AuthenticationPrincipal LoginMember loginMember,
        @PathVariable long productId
    ) {
        productService.requireExists(productId);
        return ResponseEntity.ok(
            new UserProductResponse(
                productService.isWishlisted(loginMember.id(), productId),
                productService.isShelved(loginMember.id(), productId)
            )
        );
    }
}
