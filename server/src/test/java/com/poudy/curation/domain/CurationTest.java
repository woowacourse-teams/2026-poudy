package com.poudy.curation.domain;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CurationTest {

    @Test
    void rejectsMissingBannerThumbnail() {
        assertThatThrownBy(() -> new CurationBanner("배너", "설명", null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsBlankPublicText() {
        assertThatThrownBy(() -> new CurationBanner(" ", "설명", "banner.png"))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
            () -> new Curation(
                12L,
                "seasonal-skin-care",
                new CurationBanner("배너", "설명", "banner.png"),
                " ",
                "설명",
                List.of()
            )
        ).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new CurationFilter(UUID.randomUUID(), " "))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsInvalidSlug() {
        assertThatThrownBy(
            () -> new Curation(
                12L,
                "Seasonal Skin Care",
                new CurationBanner("배너", "설명", "banner.png"),
                "상세 제목",
                "상세 설명",
                List.of()
            )
        ).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsDuplicateBlocks() {
        CurationBlock block = CurationBlock.image(UUID.randomUUID(), CurationBlock.Status.VISIBLE, 0, 0, "image");
        assertThatThrownBy(() -> curation(12L, List.of(block, block)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    public static Curation curation(Long id, List<CurationBlock> blocks) {
        return new Curation(
            id,
            "seasonal-skin-care",
            new CurationBanner("배너 제목", "배너 설명", "banner.png"),
            "상세 제목",
            "상세 설명",
            blocks
        );
    }
}
