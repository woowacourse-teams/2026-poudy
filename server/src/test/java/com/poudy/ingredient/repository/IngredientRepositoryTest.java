package com.poudy.ingredient.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.ingredient.domain.Ingredient;
import com.poudy.tag.domain.SkinEffect;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@DisplayName("성분 저장소")
class IngredientRepositoryTest {

    private static final String EGGPLANT_SOURCE = "대한화장품협회 성분사전 「가지열매추출물」(성분코드 2)";
    private static final String MICROWAVE_STUDY = "Antioxidant Activity and Phenolic Content of Microwave-Assisted "
        + "Solanum melongena Extracts (Salerno et al., 2014)";
    private static final String FERMENTED_STUDY = "Enhanced Antioxidant and Protective Effects of Fermented Solanum "
        + "melongena L. Peel Extracts Against Ultraviolet B-Induced Skin Damage (Lee et al., 2025)";

    @Autowired
    private IngredientRepository ingredientRepository;

    @Test
    @DisplayName("DB의 성분 이름·설명·수정 시각을 조회한다")
    void findsIngredientById() {
        Ingredient ingredient = ingredientRepository.findById(2L).orElseThrow();

        assertThat(ingredient.koreanName()).isEqualTo("가지열매추출물");
        assertThat(ingredient.englishName()).isEqualTo("Solanum Melongena (Eggplant) Fruit Extract");
        assertThat(ingredient.description()).isNotBlank();
        assertThat(ingredient.updatedAt()).isEqualTo(OffsetDateTime.parse("2026-08-13T08:50:49.068+09:00"));
        assertThat(ingredientRepository.findById(999_999L)).isEmpty();
    }

    @Test
    @DisplayName("설명 근거를 표시 순서대로 조회한다")
    void readsDescriptionSourcesInOrder() {
        Ingredient ingredient = ingredientRepository.findById(2L).orElseThrow();

        assertThat(ingredient.infoSources()).containsExactly(EGGPLANT_SOURCE, MICROWAVE_STUDY, FERMENTED_STUDY);
    }

    @Test
    @DisplayName("태그를 해석하고 피부 작용 태그의 근거를 순서대로 조회한다")
    void resolvesTagsWithEvidence() {
        Ingredient ingredient = ingredientRepository.findById(2L).orElseThrow();

        assertThat(ingredient.skinEffects()).extracting(SkinEffect::code).containsExactly("ANTIOXIDANT_RELATED");
        assertThat(ingredient.effectSources()).containsExactly(EGGPLANT_SOURCE, MICROWAVE_STUDY, FERMENTED_STUDY);
    }

    @Test
    @DisplayName("이명으로도 성분을 찾는다")
    void findsIngredientByAlias() {
        assertThat(ingredientRepository.suggest("가지추출물"))
            .extracting(matched -> matched.ingredient().id())
            .contains(2L);
    }

    @Test
    @DisplayName("ID 중복과 없는 성분을 제외하고 첫 요청 순서대로 페이지를 조회한다")
    void pagesDistinctRequestedIngredients() {
        var page = ingredientRepository.findPage(List.of(9L, 2L, 9L, 999999L, 1L), false, 2, 1);

        assertThat(page.items()).extracting(Ingredient::id).containsExactly(2L);
        assertThat(page.totalElements()).isEqualTo(3);
    }
}
