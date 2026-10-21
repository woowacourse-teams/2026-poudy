package com.poudy.notice.controller;

import com.poudy.common.dto.PaginationRequest;
import com.poudy.common.dto.PaginationResponse;
import com.poudy.common.web.ClientAddressResolver;
import com.poudy.notice.controller.NoticeResponses.Detail;
import com.poudy.notice.controller.NoticeResponses.Page;
import com.poudy.notice.controller.NoticeResponses.Summary;
import com.poudy.notice.controller.NoticeResponses.Uploaded;
import com.poudy.notice.domain.Notice;
import com.poudy.notice.domain.NoticeStatus;
import com.poudy.notice.service.NoticeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "관리자 공지")
@RestController
@RequestMapping("/api/admin/notices")
public class AdminNoticeController {
    private final NoticeService service;
    public AdminNoticeController(NoticeService service) {
        this.service = service;
    }

    @Operation(summary = "관리자 공지 목록 조회")
    @GetMapping
    public Page list(
        @RequestParam(required = false) @Size(max = 40) String q,
        @RequestParam(required = false) NoticeStatus status,
        @RequestParam(defaultValue = "false") boolean oldest,
        @Valid @ModelAttribute PaginationRequest pagination
    ) {
        return new Page(
            service.adminList(q, status, (long) (pagination.page() - 1) * pagination.size(), pagination.size(), oldest)
                .stream()
                .map(n -> Detail.from(n, List.of())).toList(),
            PaginationResponse.of(pagination, service.count(q, status))
        );
    }

    @Operation(summary = "공지 공개 상태와 띠 집계 조회")
    @GetMapping("/summary")
    public Summary summary() {
        long banners = service.bannerCount();
        return new Summary(
            service.count("", NoticeStatus.PUBLISHED),
            service.count("", NoticeStatus.PRIVATE),
            banners,
            Math.min(10, banners)
        );
    }

    @Operation(summary = "공지 편집 정보 조회")
    @GetMapping("/{id}")
    public Detail detail(@PathVariable UUID id) {
        return Detail.from(service.find(id, false), service.images(id));
    }

    @Operation(summary = "공지 저장 및 즉시 공개")
    @PostMapping
    public ResponseEntity<Detail> create(@Valid @RequestBody Edit r) {
        var n = service.save(null, r.title(), r.content(), r.status(), r.bannerEnabled(), r.bannerText(), r.imageIds());
        return ResponseEntity.created(URI.create("/api/admin/notices/" + n.id()))
            .body(Detail.from(n, service.images(n.id())));
    }

    @Operation(summary = "공지 수정 및 공개 상태 전환")
    @PutMapping("/{id}")
    public Detail update(@PathVariable UUID id, @Valid @RequestBody Edit r) {
        var n = service.save(id, r.title(), r.content(), r.status(), r.bannerEnabled(), r.bannerText(), r.imageIds());
        return Detail.from(n, service.images(id));
    }

    @Operation(summary = "비공개 공지 삭제")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "공지 임시 이미지 업로드")
    @PostMapping(path = "/images", consumes = "multipart/form-data")
    public ResponseEntity<Uploaded> upload(
        @RequestPart("images") List<MultipartFile> images,
        HttpServletRequest request
    ) {
        return ResponseEntity.status(201)
            .body(new Uploaded(service.upload(images, ClientAddressResolver.resolve(request))));
    }

    @Operation(summary = "관리자 공지 이미지 미리보기")
    @GetMapping("/images/{id}")
    public ResponseEntity<byte[]> image(@PathVariable UUID id) {
        var image = service.image(id);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .contentType(MediaType.parseMediaType(image.contentType())).body(service.bytes(image));
    }
    @Schema(name = "AdminNoticeEditRequest")
    public record Edit(
        @NotBlank @Schema(minLength = 1, maxLength = Notice.MAX_TITLE_LENGTH, description = "제목, Unicode code point 기준") String title,
        @NotBlank @Schema(minLength = 1, maxLength = Notice.MAX_CONTENT_LENGTH, description = "일반 텍스트 본문, Unicode code point 기준") String content,
        @NotNull NoticeStatus status,
        @NotNull Boolean bannerEnabled,
        @Schema(nullable = true, maxLength = Notice.MAX_BANNER_LENGTH, description = "띠가 켜지면 필수") String bannerText,
        @NotNull @Size(max = 5) List<@NotNull UUID> imageIds) {
    }
}
