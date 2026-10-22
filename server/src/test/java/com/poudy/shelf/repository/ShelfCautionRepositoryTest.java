package com.poudy.shelf.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.exception.InfrastructureException;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@DisplayName("선반 주의 성분군 저장소")
class ShelfCautionRepositoryTest {

    @Autowired
    private ShelfCautionRepository repository;

    @Test
    @DisplayName("등록된 성분군들의 소속 성분을 조회한다")
    void findsGroupIngredients() {
        assertThat(repository.findGroupIngredientIds(List.of("FRAGRANCE_ALLERGENS", "DRYING_ALCOHOLS")))
            .contains(9L, 20L, 532L)
            .doesNotContain(213L);
    }

    @Test
    @DisplayName("다른 성분군이 있어도 요청한 성분군이 빠져 있으면 실패한다")
    void rejectsMissingGroupAmongExistingGroups() {
        assertThatThrownBy(
            () -> repository.findGroupIngredientIds(List.of("FRAGRANCE_ALLERGENS", "MISSING_CAUTION_GROUP"))
        )
            .isInstanceOf(InfrastructureException.class)
            .hasMessageContaining("MISSING_CAUTION_GROUP");
    }
}
