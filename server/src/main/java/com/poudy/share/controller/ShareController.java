package com.poudy.share.controller;

import com.poudy.share.controller.dto.ShareMatchResponse;
import com.poudy.share.controller.dto.ShareTextRequest;
import com.poudy.share.service.ShareService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "공유", description = "공유 텍스트 기반 제품 식별 API")
@RestController
@RequestMapping("/api/products/share-matches")
public class ShareController {

    private final ShareService shareService;

    public ShareController(ShareService shareService) {
        this.shareService = shareService;
    }

    @Operation(summary = "공유 텍스트로 제품 식별", description = "올리브영 공유 텍스트 원문을 받아 제품 하나로 확정한다. "
            + "확정하면 productId 를, 확정하지 못하면 검색으로 이어 갈 keyword 를 돌려준다. "
            + "링크가 없거나 정제 후 제품명이 남지 않으면 잘못된 요청으로 거절한다.")
    @GetMapping
    public ResponseEntity<ShareMatchResponse> matchSharedProduct(@Valid @ModelAttribute ShareTextRequest request) {
        return ResponseEntity.ok(ShareMatchResponse.from(shareService.match(request.text())));
    }
}
