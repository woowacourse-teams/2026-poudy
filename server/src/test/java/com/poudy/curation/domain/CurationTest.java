package com.poudy.curation.domain;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CurationTest {

    @Test
    void rejectsVisibleBannerWithoutThumbnail() {
        assertThatThrownBy(() -> new CurationBanner(true, null))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new CurationBanner(true, " "))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void permitsHiddenBannerWithoutThumbnail() {
        assertThatCode(() -> new CurationBanner(false, null)).doesNotThrowAnyException();
    }

    @Test
    void rejectsVisibleBannerForUnpublishedCuration() {
        assertThatThrownBy(
            () -> new Curation(
                12L,
                "제목",
                "설명",
                CurationPublicationStatus.UNPUBLISHED,
                new CurationBanner(true, "banner.png"),
                CurationDetail.from(List.of())
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
                new CurationBanner(false, null),
                CurationDetail.from(List.of())
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
                new CurationBanner(true, "banner.png"),
                CurationDetail.from(List.of())
            )
        ).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
            () -> new Curation(
                12L,
                "제목",
                " ",
                CurationPublicationStatus.PUBLISHED,
                new CurationBanner(true, "banner.png"),
                CurationDetail.from(List.of())
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
            new CurationBanner(true, "banner.png"),
            CurationDetail.from(blocks)
        );
    }
}
