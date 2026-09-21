package com.poudy.curation.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class CurationsTest {

    @Test
    void selectsPublishedBannersAndDetails() {
        Curation firstBanner = curation(
            12L,
            CurationPublicationStatus.PUBLISHED,
            CurationPublicationStatus.PUBLISHED
        );
        Curation detailOnly = curation(
            4L,
            CurationPublicationStatus.UNPUBLISHED,
            CurationPublicationStatus.PUBLISHED
        );
        Curation secondBanner = curation(
            8L,
            CurationPublicationStatus.PUBLISHED,
            CurationPublicationStatus.PUBLISHED
        );
        Curation unpublished = curation(
            20L,
            CurationPublicationStatus.UNPUBLISHED,
            CurationPublicationStatus.UNPUBLISHED
        );
        List<Curation> source = new ArrayList<>(
            List.of(firstBanner, detailOnly, secondBanner, unpublished)
        );
        Curations curations = Curations.from(source);
        source.clear();

        assertThat(curations.publishedBannersInOrder())
            .extracting(Curation::id)
            .containsExactly(12L, 8L);
        assertThat(curations.findPublishedDetailById(12L)).containsSame(firstBanner);
        assertThat(curations.findPublishedDetailById(4L)).containsSame(detailOnly);
        assertThat(curations.findPublishedDetailById(20L)).isEmpty();
        assertThat(curations.findPublishedDetailById(999L)).isEmpty();
        assertThat(Curations.from(List.of()).publishedBannersInOrder()).isEmpty();
    }

    @Test
    void rejectsDuplicateCurationIds() {
        assertThatThrownBy(() -> Curations.from(List.of(curation(12L), curation(12L))))
            .isInstanceOf(IllegalArgumentException.class);
    }

    private static Curation curation(Long id) {
        return CurationTest.curation(id, List.of());
    }

    private static Curation curation(
        Long id,
        CurationPublicationStatus bannerStatus,
        CurationPublicationStatus detailStatus
    ) {
        return new Curation(
            id,
            "큐레이션 제목",
            "큐레이션 설명",
            new CurationBanner(bannerStatus, "banner.png"),
            CurationDetail.from(detailStatus, List.of())
        );
    }
}
