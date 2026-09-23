package com.poudy.excludecode.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.exception.InfrastructureException;
import com.poudy.excludecode.domain.ExcludeCodeIngredient;
import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.excludecode.domain.InvalidExcludeCodeDefinitionException;
import com.poudy.ingredient.domain.ExcludeCode;
import com.poudy.ingredient.domain.IngredientCatalog;
import com.poudy.ingredient.repository.IngredientRepository;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

@SpringBootTest
@DisplayName("제외 성분군 저장소")
class ExcludeCodeRepositoryTest {

    @Autowired
    private ExcludeCodeRepository excludeCodeRepository;

    @ParameterizedTest
    @EnumSource(ExcludeCode.class)
    @DisplayName("성분군마다 성분을 하나 이상 해석한다")
    void resolvesEveryCode(ExcludeCode code) {
        assertThat(excludeCodeRepository.findAll().of(code)).isNotEmpty()
            .allSatisfy(ingredient -> assertThat(ingredient.koreanName()).isNotBlank());
    }

    @ParameterizedTest
    @EnumSource(ExcludeCode.class)
    @DisplayName("해석한 성분은 모두 자기 성분군을 되돌려준다")
    void mapsResolvedIngredientBackToCode(ExcludeCode code) {
        ExcludeCodeIngredients excludeCodeIngredients = excludeCodeRepository.findAll();

        assertThat(excludeCodeIngredients.of(code))
            .allSatisfy(ingredient -> assertThat(excludeCodeIngredients.codesOf(ingredient.id())).contains(code));
    }

    @Test
    @DisplayName("성분을 표시 순서대로 읽는다")
    void readsIngredientsInDisplayOrder() {
        assertThat(excludeCodeRepository.findAll().of(ExcludeCode.FRAGRANCE_ALLERGENS))
            .extracting(ExcludeCodeIngredient::id)
            .startsWith(9L, 20L, 523L, 608L);
    }

    @Test
    @DisplayName("성분군 정의 오류를 조회 실패용 인프라 예외로 변환한다")
    void translatesInvalidDefinitionForQuery() {
        NamedParameterJdbcTemplate jdbc = mock(NamedParameterJdbcTemplate.class);
        IngredientRepository ingredientRepository = mock(IngredientRepository.class);
        given(
            jdbc.query(
                anyString(),
                any(MapSqlParameterSource.class),
                any(org.springframework.jdbc.core.RowMapper.class)
            )
        )
            .willReturn(List.of());
        given(ingredientRepository.findByIds(List.of())).willReturn(IngredientCatalog.from(List.of()));

        assertThatThrownBy(
            () -> new ExcludeCodeRepository(jdbc, ingredientRepository).findAll()
        )
            .isInstanceOf(InfrastructureException.class)
            .hasCauseInstanceOf(InvalidExcludeCodeDefinitionException.class);
    }
}
