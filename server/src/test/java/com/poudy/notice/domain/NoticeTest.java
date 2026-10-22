package com.poudy.notice.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class NoticeTest {
    private final Clock first = Clock.fixed(Instant.parse("2026-10-20T00:00:00Z"), ZoneOffset.UTC);
    @Test
    void preservesFirstPublicationAndCountsUnicodeCodePoints() {
        var draft = Notice.create("😀".repeat(40), "본문", NoticeStatus.PRIVATE, true, "띠", first);
        assertThat(draft.firstPublishedAt()).isNull();
        var published = draft.edit(draft.title(), draft.content(), NoticeStatus.PUBLISHED, true, "띠", first);
        var later = Clock.offset(first, java.time.Duration.ofDays(1));
        var hidden = published.edit("수정", published.content(), NoticeStatus.PRIVATE, false, null, later);
        var again = hidden.edit("수정", published.content(), NoticeStatus.PUBLISHED, false, null, later);
        assertThat(again.firstPublishedAt()).isEqualTo(published.firstPublishedAt());
        assertThatThrownBy(() -> Notice.create("😀".repeat(41), "본문", NoticeStatus.PRIVATE, false, null, first))
            .isInstanceOf(InvalidNoticeException.class);
        assertThatThrownBy(() -> Notice.create("제목", " ", NoticeStatus.PRIVATE, false, null, first))
            .isInstanceOf(InvalidNoticeException.class);
        assertThatThrownBy(() -> Notice.create("제목", "본문", NoticeStatus.PRIVATE, true, " ", first))
            .isInstanceOf(InvalidNoticeException.class);
    }

    @Test
    void contentAndBannerLimitsCountCodePointsInsteadOfUtf16Units() {
        var valid = Notice.create("제목", "😀".repeat(2000), NoticeStatus.PRIVATE, true, "😀".repeat(24), first);
        assertThat(valid.content()).isEqualTo("😀".repeat(2000));
        assertThatThrownBy(() -> valid.edit("제목", "😀".repeat(2001), NoticeStatus.PRIVATE, true, "띠", first))
            .isInstanceOf(InvalidNoticeException.class);
        assertThatThrownBy(() -> valid.edit("제목", "본문", NoticeStatus.PRIVATE, true, "😀".repeat(25), first))
            .isInstanceOf(InvalidNoticeException.class);
    }
}
