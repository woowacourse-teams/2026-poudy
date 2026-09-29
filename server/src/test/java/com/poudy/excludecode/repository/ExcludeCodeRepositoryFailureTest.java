package com.poudy.excludecode.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import com.poudy.exception.InfrastructureException;
import com.poudy.excludecode.domain.ExcludeCode;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

class ExcludeCodeRepositoryFailureTest {

    @Test
    void rejectsMissingDefinitionsWhenLookingUpIngredientGroups() {
        NamedParameterJdbcTemplate jdbc = mock(NamedParameterJdbcTemplate.class);
        given(jdbc.queryForObject(anyString(), any(MapSqlParameterSource.class), eq(Long.class)))
            .willReturn(0L);

        assertThatThrownBy(() -> new ExcludeCodeRepository(jdbc).codesOf(9L))
            .isInstanceOf(InfrastructureException.class)
            .hasMessageContaining("제외 성분군 정의를 찾지 못했습니다");
    }

    @Test
    void rejectsEmptyGroupBeforeTreatingRequestedFilterAsInvalid() {
        NamedParameterJdbcTemplate jdbc = mock(NamedParameterJdbcTemplate.class);
        given(jdbc.queryForObject(anyString(), any(MapSqlParameterSource.class), eq(Long.class)))
            .willReturn(1L);
        given(jdbc.queryForList(anyString(), any(MapSqlParameterSource.class), eq(String.class)))
            .willReturn(List.of("EMPTY_GROUP"));

        assertThatThrownBy(() -> new ExcludeCodeRepository(jdbc).containsAll(List.of(new ExcludeCode("EMPTY_GROUP"))))
            .isInstanceOf(InfrastructureException.class)
            .hasMessageContaining("EMPTY_GROUP");
    }

    @Test
    void doesNotReadGroupDefinitionsForUnfilteredProducts() {
        NamedParameterJdbcTemplate jdbc = mock(NamedParameterJdbcTemplate.class);

        assertThat(new ExcludeCodeRepository(jdbc).containsAll(List.of())).isTrue();

        verifyNoInteractions(jdbc);
    }
}
