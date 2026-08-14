package com.poudy.excludecode.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import org.junit.jupiter.api.Test;

class ExcludeCodeTest {

    @Test
    void 각_제외_성분군은_표시명과_설명을_가진다() {
        assertThat(Arrays.asList(ExcludeCode.values())).allSatisfy(code -> {
            assertThat(code.displayName()).isNotBlank();
            assertThat(code.description()).isNotBlank();
        });
    }
}
