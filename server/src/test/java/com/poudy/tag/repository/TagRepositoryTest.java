package com.poudy.tag.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.common.json.JsonDataReader;
import com.poudy.tag.domain.TagCategory;
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
            .get()
            .satisfies(tag -> {
                assertThat(tag.id()).isEqualTo(47L);
                assertThat(tag.isOf(TagCategory.BIOLOGICAL_EFFECT)).isTrue();
                assertThat(tag.code()).isEqualTo("ANTIOXIDANT_RELATED");
                assertThat(tag.name()).isEqualTo("항산화 관련");
            });
    }
}
