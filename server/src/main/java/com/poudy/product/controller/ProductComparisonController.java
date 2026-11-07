package com.poudy.product.controller;

import com.poudy.product.controller.dto.ProductComparisonRequest;
import com.poudy.product.controller.dto.ProductComparisonResponse;
import com.poudy.product.service.ProductComparisonService;
import com.poudy.security.session.LoginMember;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "제품", description = "제품 조회 API")
@RestController
@RequestMapping("/api/products")
public class ProductComparisonController {

    private final ProductComparisonService service;

    public ProductComparisonController(ProductComparisonService service) {
        this.service = service;
    }

    @Operation(summary = "제품 비교 정보 조회", description = "최대 3개 제품을 요청 순서대로 비교한다. "
        + "카테고리·전체 제품 표식·갱신 시각과 옵션별 가격·용량·판매 상태를 제공하고 피부 타입·민감성 정보는 제외한다. "
        + "productIds=101,202&partIds[101]=473처럼 제품별 구성품을 선택하고 생략하면 첫 구성품을 선택한다. "
        + "피부 작용 상위 3개·유수분·주의 성분·내 필터는 선택한 구성품 기준이며, 구성품이 없으면 selectedPart는 null이다. "
        + "유수분 미제공 카테고리는 null을 반환한다. 로그인 회원의 내 필터 결과도 함께 제공하며 모든 응답은 캐시하지 않는다.")
    @GetMapping("/comparison")
    public ResponseEntity<ProductComparisonResponse> compare(
        @Valid @ModelAttribute ProductComparisonRequest request,
        @AuthenticationPrincipal LoginMember loginMember
    ) {
        return ResponseEntity.ok(
            ProductComparisonResponse.from(
                service.compare(request.toSelections(), memberId(loginMember))
            )
        );
    }

    private Long memberId(LoginMember loginMember) {
        if (loginMember == null) {
            return null;
        }
        return loginMember.id();
    }
}
