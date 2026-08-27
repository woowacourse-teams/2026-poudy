package com.poudy.tag.domain;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("태그 컬렉션")
class TagsTest {

    @Test
    @DisplayName("같은 ID의 태그를 가질 수 없다")
    void rejectsDuplicateIds() {
        List<Tag> tags = List.of(
            new Tag(1L, TagCategory.FUNCTION, "ABRASIVE", "연마제"),
            new Tag(1L, TagCategory.FUNCTION, "ABSORBENT", "흡수제")
        );

        assertThatThrownBy(() -> Tags.from(tags))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("태그 ID는 중복될 수 없습니다.");
    }
}
