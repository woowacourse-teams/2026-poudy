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
    @DisplayName("DB의 큐레이션을 배너 순서대로 조회한다")
    void loadsPublicContentInBannerOrder() {
        assertThat(curationRepository.findAll().inOrder()).extracting(Curation::id).containsExactly(12L, 4L);
        assertThat(curationRepository.findAll().findById(12L).orElseThrow().banner().title())
            .isEqualTo("환절기 장벽 케어");
    }
}
