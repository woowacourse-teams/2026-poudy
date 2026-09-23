package com.poudy.curation.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class CurationsTest {

    @Test
    void selectsVisibleBannersAndPublishedCurations() {
        Curation firstBanner = curation(
            12L,
            CurationPublicationStatus.PUBLISHED,
            true
        );
        Curation hiddenBanner = curation(
            4L,
            CurationPublicationStatus.PUBLISHED,
            false
        );
        Curation secondBanner = curation(
            8L,
            CurationPublicationStatus.PUBLISHED,
            true
        );
        Curation unpublished = curation(
            20L,
            CurationPublicationStatus.UNPUBLISHED,
            false
        );
        List<Curation> source = new ArrayList<>(
            List.of(firstBanner, hiddenBanner, secondBanner, unpublished)
        );
        Curations curations = Curations.from(source);
        source.clear();

        assertThat(curations.visibleBannersInOrder())
            .extracting(Curation::id)
            .containsExactly(12L, 8L);
        assertThat(curations.findPublishedById(12L)).containsSame(firstBanner);
        assertThat(curations.findPublishedById(4L)).containsSame(hiddenBanner);
        assertThat(curations.findPublishedById(20L)).isEmpty();
        assertThat(curations.findPublishedById(999L)).isEmpty();
        assertThat(Curations.from(List.of()).visibleBannersInOrder()).isEmpty();
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
        CurationPublicationStatus publicationStatus,
        boolean bannerVisible
    ) {
        return new Curation(
            id,
            "큐레이션 제목",
            "큐레이션 설명",
            publicationStatus,
            bannerVisible,
            bannerVisible ? "banner.png" : null,
            List.of()
        );
    }
}
