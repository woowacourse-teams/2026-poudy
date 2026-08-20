package com.poudy.tag.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.common.json.JsonDataReader;
import com.poudy.exception.InfrastructureException;
import com.poudy.tag.domain.Tag;
import com.poudy.tag.domain.TagCategory;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;

@DisplayName("태그 저장소")
class TagRepositoryTest {

    @Test
    @DisplayName("tags.json의 태그를 ID로 조회한다")
    void findsTagById() {
        TagRepository repository = new TagRepository(new JsonDataReader(new DefaultResourceLoader()));

        assertThat(repository.findAll().findById(47L))
                .contains(new Tag(47L, TagCategory.BIOLOGICAL_EFFECT, "ANTIOXIDANT_RELATED", "항산화 관련"));
    }

    @Test
    @DisplayName("같은 ID의 태그가 있으면 로딩에 실패한다")
    void rejectsDuplicateIds() {
        JsonDataReader jsonDataReader = mock(JsonDataReader.class);
        given(jsonDataReader.readList("tags.json", Tag.class))
                .willReturn(
                        List.of(
                                new Tag(1L, TagCategory.FUNCTION, "ABRASIVE", "연마제"),
                                new Tag(1L, TagCategory.FUNCTION, "ABSORBENT", "흡수제")));

        assertThatThrownBy(() -> new TagRepository(jsonDataReader))
                .isInstanceOf(InfrastructureException.class)
                .hasMessageContaining("태그 ID가 중복되었습니다")
                .hasMessageContaining("1");
    }
}
