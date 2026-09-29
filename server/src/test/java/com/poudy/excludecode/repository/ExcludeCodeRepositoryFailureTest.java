package com.poudy.excludecode.repository;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.exception.InfrastructureException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

class ExcludeCodeRepositoryFailureTest {

    @Test
    void rejectsExcludeCodeWithoutIngredientsWhenLookingUpIngredientGroups() {
        NamedParameterJdbcTemplate jdbc = mock(NamedParameterJdbcTemplate.class);
        given(jdbc.queryForList(anyString(), any(MapSqlParameterSource.class), eq(String.class)))
            .willReturn(List.of("SULFATES"));

        assertThatThrownBy(() -> new ExcludeCodeRepository(jdbc).codesOf(9L))
            .isInstanceOf(InfrastructureException.class)
            .hasMessageContaining("SULFATES");
    }
}
