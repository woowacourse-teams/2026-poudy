package com.poudy.notice.controller;

import com.poudy.common.dto.PaginationResponse;
import com.poudy.notice.domain.Notice;
import com.poudy.notice.domain.NoticeImage;
import com.poudy.notice.domain.NoticeStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class NoticeResponses {
    private NoticeResponses() {
    }
    @Schema(name = "NoticeResponse")
    public record Detail(
        @NotNull UUID id,
        @NotNull String title,
        @NotNull String content,
        @NotNull String authorName,
        @NotNull NoticeStatus status,
        @NotNull Boolean bannerEnabled,
        @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String bannerText,
        @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) OffsetDateTime firstPublishedAt,
        @NotNull Long viewCount,
        @NotNull OffsetDateTime createdAt,
        @NotNull OffsetDateTime updatedAt,
        @NotNull List<Image> images) {
        public static Detail from(Notice n, List<NoticeImage> images) {
            return new Detail(
                n.id(),
                n.title(),
                n.content(),
                "관리자",
                n.status(),
                n.bannerEnabled(),
                n.bannerText(),
                n.firstPublishedAt(),
                n.viewCount(),
                n.createdAt(),
                n.updatedAt(),
                images.stream().map(i -> new Image(i.id())).toList()
            );
        }
    }

    @Schema(name = "NoticeImageResponse")
    public record Image(@NotNull UUID imageId) {
    }

    @Schema(name = "NoticePageResponse")
    public record Page(@NotNull List<Detail> items, @NotNull PaginationResponse pagination) {
    }

    @Schema(name = "NoticeBannerResponse")
    public record Banner(@NotNull UUID id, @NotNull String text) {
    }

    @Schema(name = "NoticeBannersResponse")
    public record Banners(@NotNull List<Banner> items) {
    }

    @Schema(name = "AdminNoticeSummaryResponse")
    public record Summary(
        @NotNull Long published,
        @NotNull Long privateCount,
        @NotNull Long bannerEnabledCount,
        @NotNull Long bannerVisibleCount) {
    }

    @Schema(name = "NoticeImageUploadResponse")
    public record Uploaded(@NotNull List<UUID> imageIds) {
    }
}
