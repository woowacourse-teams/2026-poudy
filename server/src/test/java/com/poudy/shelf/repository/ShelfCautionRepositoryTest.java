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
@DisplayName("파우치 주의 성분군 저장소")
class ShelfCautionRepositoryTest {

    @Autowired
    private ShelfCautionRepository repository;

    @Test
    @DisplayName("각 성분군의 소속 성분을 구분해서 조회한다")
    void findsGroupIngredients() {
        var groupIngredients = repository.findIngredientIdsByGroup(List.of("FRAGRANCE_ALLERGENS", "DRYING_ALCOHOLS"));

        assertThat(groupIngredients).hasSize(2);
        assertThat(groupIngredients.get("FRAGRANCE_ALLERGENS")).contains(9L, 20L).doesNotContain(532L, 213L);
        assertThat(groupIngredients.get("DRYING_ALCOHOLS")).contains(532L).doesNotContain(9L, 20L, 213L);
    }

    @Test
    @DisplayName("다른 성분군이 있어도 요청한 성분군이 빠져 있으면 실패한다")
    void rejectsMissingGroupAmongExistingGroups() {
        assertThatThrownBy(
            () -> repository.findIngredientIdsByGroup(List.of("FRAGRANCE_ALLERGENS", "MISSING_CAUTION_GROUP"))
        )
            .isInstanceOf(InfrastructureException.class)
            .hasMessageContaining("MISSING_CAUTION_GROUP");
    }
}
