package com.poudy.curation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.curation.domain.Curation;
import com.poudy.curation.domain.CurationStatus;
import com.poudy.curation.domain.Curations;
import com.poudy.curation.repository.CurationRepository;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("큐레이션 서비스")
class CurationServiceTest {

    @Test
    @DisplayName("게시 중인 큐레이션만 ID순으로 조회한다")
    void findsPublishedCurations() {
        Curation highId = curation(12L, CurationStatus.PUBLISHED);
        Curation lowId = curation(4L, CurationStatus.PUBLISHED);
        Curation draft = curation(20L, CurationStatus.DRAFT);
        CurationService service = serviceWith(Curations.from(List.of(highId, draft, lowId)));

        assertThat(service.findCurations()).extracting(Curation::id).containsExactly(4L, 12L);
        assertThat(service.findDetail(12L)).isSameAs(highId);
    }

    @ParameterizedTest
    @ValueSource(longs = {20L, 30L, 999L})
    @DisplayName("작성 중, 게시 종료 또는 존재하지 않는 큐레이션은 찾을 수 없다")
    void rejectsUnavailableCuration(Long curationId) {
        CurationService service = serviceWith(
            Curations.from(
                List.of(
                    curation(20L, CurationStatus.DRAFT),
                    curation(30L, CurationStatus.ARCHIVED)
                )
            )
        );

        assertThatThrownBy(() -> service.findDetail(curationId))
            .isInstanceOf(ResourceNotFoundException.class)
            .extracting(exception -> ((ResourceNotFoundException) exception).code())
            .isEqualTo(ErrorCode.CURATION_NOT_FOUND);
    }

    private static CurationService serviceWith(Curations curations) {
        CurationRepository repository = mock(CurationRepository.class);
        given(repository.findAll()).willReturn(curations);
        return new CurationService(repository);
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
