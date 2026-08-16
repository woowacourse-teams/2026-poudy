package com.poudy.excludecode.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.common.json.JsonDataReader;
import com.poudy.exception.InfrastructureException;
import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.excludecode.domain.ExcludeCodeMapping;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;

@SpringBootTest
@DisplayName("제외 성분군 저장소")
class ExcludeCodeRepositoryTest {

    @Autowired
    private ExcludeCodeRepository excludeCodeRepository;

    @Test
    @DisplayName("파일에서 성분군마다 코드와 성분 ID 목록을 읽는다")
    void readsCodeAndIngredientIds() {
        List<ExcludeCodeMapping> mappings = excludeCodeRepository.findAll();

        assertThat(mappings).extracting(ExcludeCodeMapping::code)
                .containsExactlyInAnyOrder(ExcludeCode.values());
        assertThat(mappings).allSatisfy(mapping -> assertThat(mapping.ingredientIds()).isNotEmpty());
    }

    @Test
    @DisplayName("모르는 성분군 코드가 있으면 로딩에 실패한다")
    void rejectsUnknownCode() {
        assertThatThrownBy(() -> load("""
                {"exclude_codes":[{"code":"UNKNOWN_CODE","ingredient_ids":[1]}]}
                """)).isInstanceOf(InfrastructureException.class);
    }

    @Test
    @DisplayName("성분 ID 가 비어 있으면 로딩에 실패한다")
    void rejectsNullIngredientId() {
        assertThatThrownBy(() -> load("""
                {"exclude_codes":[{"code":"SULFATES","ingredient_ids":[1,null]}]}
                """)).isInstanceOf(InfrastructureException.class);
    }

    private static ExcludeCodeRepository load(String excludeCodeData) {
        DefaultResourceLoader resourceLoader = new DefaultResourceLoader() {

            @Override
            public Resource getResource(String location) {
                return new ByteArrayResource(excludeCodeData.getBytes(StandardCharsets.UTF_8));
            }
        };

        return new ExcludeCodeRepository(new JsonDataReader(resourceLoader));
    }
}
