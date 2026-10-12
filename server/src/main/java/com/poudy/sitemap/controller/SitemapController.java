package com.poudy.sitemap.controller;

import com.poudy.sitemap.controller.dto.SitemapResponse;
import com.poudy.sitemap.domain.ContentUpdates;
import com.poudy.sitemap.service.SitemapService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "사이트맵", description = "사이트맵 조회 API")
@RestController
@RequestMapping("/api/sitemap")
public class SitemapController {

    private final SitemapService sitemapService;

    public SitemapController(SitemapService sitemapService) {
        this.sitemapService = sitemapService;
    }

    @Operation(summary = "사이트맵 수정일 조회", description = "카테고리·브랜드·게시 큐레이션·제품에 쓰인 성분의 내용이 마지막으로 바뀐 시각을 조회한다.")
    @GetMapping
    public ResponseEntity<SitemapResponse> findContentUpdates() {
        ContentUpdates updates = sitemapService.findContentUpdates();

        return ResponseEntity.ok(SitemapResponse.from(updates));
    }
}
