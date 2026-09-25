package com.poudy.curation.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.curation.domain.Curation;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@DisplayName("큐레이션 저장소")
class CurationRepositoryTest {

    @Autowired
    private CurationRepository curationRepository;

    @Test
    @DisplayName("DB의 큐레이션 중 노출 배너만 순서대로 조회하고 게시 상태로 상세를 가른다")
    void loadsPublicContentInBannerOrder() {
        assertThat(curationRepository.findAll().visibleBannersInOrder()).extracting(Curation::id).containsExactly(12L);
        assertThat(curationRepository.findAll().visibleBannersInOrder().getFirst().title())
            .isEqualTo("환절기 장벽 케어");
        assertThat(curationRepository.findAll().findPublishedById(4L)).isPresent();
        assertThat(curationRepository.findAll().findPublishedById(20L)).isEmpty();
    }
}
