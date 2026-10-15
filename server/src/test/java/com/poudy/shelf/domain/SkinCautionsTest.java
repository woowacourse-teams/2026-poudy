package com.poudy.shelf.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.skintype.domain.SkinType;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("피부 주의 종류")
class SkinCautionsTest {

    @Test
    @DisplayName("피부 타입마다 주의 종류를 고르고 복합성은 건성과 지성 주의를 함께 고른다")
    void choosesCautionsBySkinType() {
        assertThat(SkinCautions.of(SkinType.DRY, false).values()).containsExactly(SkinCaution.DRY_SKIN);
        assertThat(SkinCautions.of(SkinType.OILY, false).values()).containsExactly(SkinCaution.OILY_SKIN);
        assertThat(SkinCautions.of(SkinType.COMBINATION, false).values())
            .containsExactlyInAnyOrder(SkinCaution.DRY_SKIN, SkinCaution.OILY_SKIN);
        assertThat(SkinCautions.of(null, null).values()).isEmpty();
    }

    @Test
    @DisplayName("민감성은 피부 타입과 따로 더한다")
    void addsSensitiveSkinIndependently() {
        assertThat(SkinCautions.of(SkinType.DRY, true).values())
            .containsExactlyInAnyOrder(SkinCaution.DRY_SKIN, SkinCaution.SENSITIVE_SKIN);
        assertThat(SkinCautions.of(null, true).values()).containsExactly(SkinCaution.SENSITIVE_SKIN);
    }

    @Test
    @DisplayName("주의 종류들의 성분군을 중복 없이 모으고, 코드에 적은 성분과 성분군 소속 성분을 합친다")
    void combinesGroupsAndIngredients() {
        SkinCautions cautions = SkinCautions.of(SkinType.DRY, true);

        assertThat(cautions.ingredientGroupCodes())
            .containsExactly(
                "AHA",
                "DRYING_ALCOHOLS",
                "FRAGRANCE_ALLERGENS",
                "HARSH_PRESERVATIVES",
                "RETINOIDS",
                "SULFATES"
            );
        assertThat(cautions.ingredientIdsWith(List.of(9L)))
            .contains(9L, 3663L, 2365L, 527L)
            .doesNotContain(317L);
    }
}
