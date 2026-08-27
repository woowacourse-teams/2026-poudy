package com.poudy.product.domain.sensory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.params.provider.Arguments.arguments;

import java.util.Arrays;
import java.util.List;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

@DisplayName("감각 추론 모델 버전")
public class SensoryModelVersionTest {

    @Test
    @DisplayName("v0 계산에 사용한 세 버전을 보관한다")
    public void keepsEveryVersion() {
        SensoryModelVersion version = versionWith(-1, null);

        assertThat(version.ingredientProfileVersion()).isEqualTo("ingredient-1");
        assertThat(version.categoryPriorVersion()).isEqualTo("category-2");
        assertThat(version.levelModelVersion()).isEqualTo("level-3");
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidVersions")
    @DisplayName("각 버전은 비어 있을 수 없다")
    public void rejectsMissingOrBlankVersion(String name, int index, String invalidVersion) {
        assertThatThrownBy(() -> versionWith(index, invalidVersion))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining(name);
    }

    private static Stream<Arguments> invalidVersions() {
        List<String> names = List.of(
            "성분 감각 프로필",
            "카테고리 배합 사전분포",
            "감각 레벨 모델"
        );
        List<String> invalidValues = Arrays.asList(null, "", " ");

        return IntStream.range(0, names.size())
            .boxed()
            .flatMap(
                index -> invalidValues.stream()
                    .map(value -> arguments(names.get(index), index, value))
            );
    }

    private static SensoryModelVersion versionWith(int invalidIndex, String invalidVersion) {
        String[] versions = {"ingredient-1", "category-2", "level-3"};
        if (invalidIndex >= 0) {
            versions[invalidIndex] = invalidVersion;
        }

        return new SensoryModelVersion(
            versions[0],
            versions[1],
            versions[2]
        );
    }
}
