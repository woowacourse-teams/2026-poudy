package com.poudy.curation.domain;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CurationTest {

    @Test
    void rejectsVisibleBannerWithoutThumbnail() {
        assertThatThrownBy(() -> publishedWithBanner(true, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> publishedWithBanner(true, " ")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void permitsHiddenBannerWithoutThumbnail() {
        assertThatCode(() -> publishedWithBanner(false, null)).doesNotThrowAnyException();
    }

    private static Curation publishedWithBanner(boolean visible, String thumbnailImageUrl) {
        return new Curation(
            12L,
            "제목",
            "설명",
            CurationPublicationStatus.PUBLISHED,
            visible,
            thumbnailImageUrl,
            List.of()
        );
    }

    @Test
    void rejectsVisibleBannerForUnpublishedCuration() {
        assertThatThrownBy(
            () -> new Curation(
                12L,
                "제목",
                "설명",
                CurationPublicationStatus.UNPUBLISHED,
                true,
                "banner.png",
                List.of()
            )
        ).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void permitsPublishedCurationWithHiddenBanner() {
        assertThatCode(
            () -> new Curation(
                12L,
                "제목",
                "설명",
                CurationPublicationStatus.PUBLISHED,
                false,
                null,
                List.of()
            )
        ).doesNotThrowAnyException();
    }

    @Test
    void rejectsBlankPublicText() {
        assertThatThrownBy(
            () -> new Curation(
                12L,
                " ",
                "설명",
                CurationPublicationStatus.PUBLISHED,
                true,
                "banner.png",
                List.of()
            )
        ).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
            () -> new Curation(
                12L,
                "제목",
                " ",
                CurationPublicationStatus.PUBLISHED,
                true,
                "banner.png",
                List.of()
            )
        ).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new CurationFilter(UUID.randomUUID(), " "))
            .isInstanceOf(IllegalArgumentException.class);
    }

    public static Curation curation(Long id, List<CurationBlock> blocks) {
        return new Curation(
            id,
            "큐레이션 제목",
            "큐레이션 설명",
            CurationPublicationStatus.PUBLISHED,
            true,
            "banner.png",
            blocks
        );
    }
}
