package com.poudy.config;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.exception.InfrastructureException;
import com.poudy.excludecode.domain.ExcludeCodeMapping;
import com.poudy.excludecode.domain.InvalidExcludeCodeDefinitionException;
import com.poudy.excludecode.repository.ExcludeCodeRepository;
import com.poudy.ingredient.domain.IngredientCatalog;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제외 성분군 설정")
class ExcludeCodeConfigTest {

    @Test
    @DisplayName("도메인 정의 오류를 기동 실패용 인프라 예외로 변환한다")
    void translatesInvalidDefinitionForStartup() {
        ExcludeCodeRepository repository = mock(ExcludeCodeRepository.class);
        given(repository.findAll()).willReturn(List.<ExcludeCodeMapping>of());

        assertThatThrownBy(
            () -> new ExcludeCodeConfig().excludeCodeIngredients(repository, IngredientCatalog.from(List.of()))
        )
            .isInstanceOf(InfrastructureException.class)
            .hasCauseInstanceOf(InvalidExcludeCodeDefinitionException.class);
    }
}
