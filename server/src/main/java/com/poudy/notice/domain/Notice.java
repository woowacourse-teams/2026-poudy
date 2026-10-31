package com.poudy.notice.domain;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

public final class Notice {
    public static final int MAX_TITLE_LENGTH = 40;
    public static final int MAX_CONTENT_LENGTH = 2000;
    public static final int MAX_BANNER_LENGTH = 24;
    public static final int MAX_IMAGE_COUNT = 5;
    private final UUID id;
    private final String title;
    private final String content;
    private final NoticeStatus status;
    private final boolean bannerEnabled;
    private final String bannerText;
    private final OffsetDateTime firstPublishedAt;
    private final long viewCount;
    private final OffsetDateTime createdAt;
    private final OffsetDateTime updatedAt;
    public Notice(
        UUID id,
        String title,
        String content,
        NoticeStatus status,
        boolean bannerEnabled,
        String bannerText,
        OffsetDateTime published,
        long views,
        OffsetDateTime created,
        OffsetDateTime updated
    ) {
        requireText(title, MAX_TITLE_LENGTH);
        requireText(content, MAX_CONTENT_LENGTH);
        if (bannerEnabled) {
            requireText(bannerText, MAX_BANNER_LENGTH);
        } else if (bannerText != null && bannerText.codePointCount(0, bannerText.length()) > MAX_BANNER_LENGTH) {
            throw new InvalidNoticeException();
        }
        this.id = Objects.requireNonNull(id);
        this.title = title;
        this.content = content;
        this.status = Objects.requireNonNull(status);
        this.bannerEnabled = bannerEnabled;
        this.bannerText = bannerText;
        this.firstPublishedAt = published;
        this.viewCount = views;
        this.createdAt = created;
        this.updatedAt = updated;
        if (status == NoticeStatus.PUBLISHED && published == null) {
            throw new InvalidNoticeException();
        }
    }

    public static Notice create(
        String title,
        String content,
        NoticeStatus status,
        boolean enabled,
        String text,
        Clock clock
    ) {
        var now = OffsetDateTime.now(clock);
        return new Notice(
            UUID.randomUUID(),
            title,
            content,
            status,
            enabled,
            text,
            status == NoticeStatus.PUBLISHED ? now : null,
            0,
            now,
            now
        );
    }

    public Notice edit(String title, String content, NoticeStatus status, boolean enabled, String text, Clock clock) {
        var now = OffsetDateTime.now(clock);
        return new Notice(
            id,
            title,
            content,
            status,
            enabled,
            text,
            firstPublishedAt == null && status == NoticeStatus.PUBLISHED ? now : firstPublishedAt,
            viewCount,
            createdAt,
            now
        );
    }

    public boolean isPublished() {
        return status == NoticeStatus.PUBLISHED;
    }

    private static void requireText(String text, int max) {
        if (text == null || text.isBlank() || text.codePointCount(0, text.length()) > max) {
            throw new InvalidNoticeException();
        }
    }

    public UUID id() {
        return id;
    }

    public String title() {
        return title;
    }

    public String content() {
        return content;
    }

    public NoticeStatus status() {
        return status;
    }

    public boolean bannerEnabled() {
        return bannerEnabled;
    }

    public String bannerText() {
        return bannerText;
    }

    public OffsetDateTime firstPublishedAt() {
        return firstPublishedAt;
    }

    public long viewCount() {
        return viewCount;
    }

    public OffsetDateTime createdAt() {
        return createdAt;
    }

    public OffsetDateTime updatedAt() {
        return updatedAt;
    }
}
