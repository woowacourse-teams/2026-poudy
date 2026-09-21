package com.poudy.curation.domain;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CurationTest {

    @Test
    void rejectsMissingBannerThumbnail() {
        assertThatThrownBy(() -> new CurationBanner(CurationPublicationStatus.PUBLISHED, null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsPublishedBannerWithoutPublishedDetail() {
        assertThatThrownBy(
            () -> curation(
                12L,
                List.of(),
                CurationPublicationStatus.PUBLISHED,
                CurationPublicationStatus.UNPUBLISHED
            )
        ).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsBlankPublicText() {
        assertThatThrownBy(
            () -> new Curation(
                12L,
                " ",
                "설명",
                new CurationBanner(CurationPublicationStatus.PUBLISHED, "banner.png"),
                CurationDetail.from(CurationPublicationStatus.PUBLISHED, List.of())
            )
        ).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
            () -> new Curation(
                12L,
                "제목",
                " ",
                new CurationBanner(CurationPublicationStatus.PUBLISHED, "banner.png"),
                CurationDetail.from(CurationPublicationStatus.PUBLISHED, List.of())
            )
        ).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new CurationFilter(UUID.randomUUID(), " "))
            .isInstanceOf(IllegalArgumentException.class);
    }

    public static Curation curation(Long id, List<CurationBlock> blocks) {
        return curation(
            id,
            blocks,
            CurationPublicationStatus.PUBLISHED,
            CurationPublicationStatus.PUBLISHED
        );
    }

    private static Curation curation(
        Long id,
        List<CurationBlock> blocks,
        CurationPublicationStatus bannerStatus,
        CurationPublicationStatus detailStatus
    ) {
        return new Curation(
            id,
            "큐레이션 제목",
            "큐레이션 설명",
            new CurationBanner(bannerStatus, "banner.png"),
            CurationDetail.from(detailStatus, blocks)
        );
    }
}
