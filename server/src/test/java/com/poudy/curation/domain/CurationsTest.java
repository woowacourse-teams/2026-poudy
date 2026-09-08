package com.poudy.curation.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("큐레이션 목록")
class CurationsTest {

    @Test
    @DisplayName("게시 중인 큐레이션만 ID 오름차순으로 조회한다")
    void findsPublishedCurationsSortedById() {
        Curation highId = curation(12L, CurationStatus.PUBLISHED);
        Curation draft = curation(20L, CurationStatus.DRAFT);
        Curation lowId = curation(4L, CurationStatus.PUBLISHED);
        Curation archived = curation(30L, CurationStatus.ARCHIVED);
        Curations curations = Curations.from(List.of(highId, draft, lowId, archived));

        assertThat(curations.publishedSortedById())
            .extracting(Curation::id)
            .containsExactly(4L, 12L);
        assertThat(curations.findPublishedById(12L)).contains(highId);
        assertThat(curations.findPublishedById(20L)).isEmpty();
        assertThat(curations.findPublishedById(30L)).isEmpty();
        assertThat(curations.findPublishedById(999L)).isEmpty();
    }

    @Test
    @DisplayName("큐레이션 ID는 중복될 수 없다")
    void rejectsDuplicateIds() {
        assertThatThrownBy(
            () -> Curations.from(
                List.of(curation(12L, CurationStatus.DRAFT), curation(12L, CurationStatus.PUBLISHED))
            )
        ).isInstanceOf(IllegalArgumentException.class);
    }

    private static Curation curation(Long id, CurationStatus status) {
        return new Curation(
            id,
            "제목",
            "간단 설명",
            "상세 설명",
            List.of("https://example.com/main.png"),
            List.of(),
            List.of(),
            status
        );
    }
}
