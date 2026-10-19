package com.poudy.curation.repository;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.exception.InfrastructureException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@DisplayName("큐레이션 저장소")
class CurationRepositoryTest {

    @Autowired
    private CurationRepository curationRepository;
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @Transactional
    void rejectsInvalidDocumentsInsteadOfSilentlyReturningEmptyBlocks() {
        jdbc.update("update curation set blocks = '[{}]'::jsonb where id = 12");
        assertThatThrownBy(() -> curationRepository.findPublishedById(12L))
            .isInstanceOf(InfrastructureException.class).hasMessageContaining("id=12");
    }

}
