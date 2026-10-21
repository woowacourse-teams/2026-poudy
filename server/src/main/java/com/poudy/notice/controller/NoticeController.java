package com.poudy.notice.controller;

import com.poudy.common.dto.PaginationRequest;
import com.poudy.common.dto.PaginationResponse;
import com.poudy.notice.controller.NoticeResponses.Banner;
import com.poudy.notice.controller.NoticeResponses.Banners;
import com.poudy.notice.controller.NoticeResponses.Detail;
import com.poudy.notice.controller.NoticeResponses.Page;
import com.poudy.notice.domain.NoticeStatus;
import com.poudy.notice.service.NoticeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "공지사항")
@RestController
@RequestMapping("/api/notices")
public class NoticeController {
    private final NoticeService service;
    public NoticeController(NoticeService service) {
        this.service = service;
    }

    @Operation(summary = "공개 공지 목록 조회")
    @GetMapping
    public ResponseEntity<Page> list(@Valid @ModelAttribute PaginationRequest pagination) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(
            new Page(
                service.list(
                    "",
                    NoticeStatus.PUBLISHED,
                    (long) (pagination.page() - 1) * pagination.size(),
                    pagination.size()
                ).stream().map(n -> Detail.from(n, List.of())).toList(),
                PaginationResponse.of(pagination, service.count("", NoticeStatus.PUBLISHED))
            )
        );
    }

    @Operation(summary = "상단 공지 띠 최대 10개 조회")
    @GetMapping("/banners")
    public ResponseEntity<Banners> banners() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(new Banners(service.banners().stream().map(n -> new Banner(n.id(), n.bannerText())).toList()));
    }

    @Operation(summary = "공개 공지 상세 조회")
    @GetMapping("/{id}")
    public ResponseEntity<Detail> detail(@PathVariable UUID id) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(Detail.from(service.find(id, true), service.images(id)));
    }

    @Operation(summary = "공개 공지 상세 진입 조회수 기록")
    @PostMapping("/{id}/views")
    public ResponseEntity<Void> view(@PathVariable UUID id) {
        service.view(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "공개 공지 첨부 이미지 조회")
    @GetMapping("/{id}/images/{imageId}")
    public ResponseEntity<byte[]> image(@PathVariable UUID id, @PathVariable UUID imageId) {
        var image = service.publicImage(id, imageId);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .contentType(MediaType.parseMediaType(image.contentType())).body(service.bytes(image));
    }
}
