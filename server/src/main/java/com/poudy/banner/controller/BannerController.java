package com.poudy.banner.controller;

import com.poudy.banner.controller.dto.BannerListResponse;
import com.poudy.banner.controller.dto.BannerResponse;
import com.poudy.banner.domain.BannerSlot;
import com.poudy.banner.service.BannerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "배너", description = "배너 조회 API")
@RestController
@RequestMapping("/api/banners")
public class BannerController {
    private final BannerService service;

    public BannerController(BannerService service) {
        this.service = service;
    }

    @Operation(summary = "배너 목록 조회", description = "요청한 슬롯에서 노출 가능하고 이동 대상이 유효한 배너를 표시 순서대로 조회한다.")
    @GetMapping
    public ResponseEntity<BannerListResponse> findBanners(@RequestParam BannerSlot slot) {
        return ResponseEntity
            .ok(new BannerListResponse(service.findBanners(slot).stream().map(BannerResponse::from).toList()));
    }
}
