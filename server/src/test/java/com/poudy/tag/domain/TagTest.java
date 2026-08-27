package com.poudy.tag.domain;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("태그")
class TagTest {

    @Test
    @DisplayName("ID와 구분이 없으면 만들 수 없다")
    void rejectsMissingIdentity() {
        assertThatThrownBy(() -> new Tag(null, TagCategory.FUNCTION, "HUMECTANT", "습윤제"))
            .isInstanceOf(NullPointerException.class)
            .hasMessage("태그 ID가 필요합니다.");
        assertThatThrownBy(() -> new Tag(1L, null, "HUMECTANT", "습윤제"))
            .isInstanceOf(NullPointerException.class)
            .hasMessage("태그 구분이 필요합니다.");
    }

    @Test
    @DisplayName("코드와 이름이 비어 있으면 만들 수 없다")
    void rejectsBlankText() {
        assertThatThrownBy(() -> new Tag(1L, TagCategory.FUNCTION, " ", "습윤제"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("태그 코드가 필요합니다.");
        assertThatThrownBy(() -> new Tag(1L, TagCategory.FUNCTION, "HUMECTANT", " "))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("태그 이름이 필요합니다.");
    }
}
