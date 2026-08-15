package com.poudy.excludecode.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HexFormat;
import org.junit.jupiter.api.Test;

class ExcludeCodeTest {

    @Test
    void 각_제외_성분군은_표시명과_설명을_가진다() {
        assertThat(Arrays.asList(ExcludeCode.values())).allSatisfy(code -> {
            assertThat(code.displayName()).isNotBlank();
            assertThat(code.description()).isNotBlank();
        });
    }

    @Test
    void 고정_성분명은_해당_제외_성분군이_가진다() {
        assertThat(ExcludeCode.FRAGRANCE_ALLERGENS.ingredientNames()).contains("향료", "리날룰");
        assertThat(ExcludeCode.DRYING_ALCOHOLS.ingredientNames()).contains("변성알코올", "에탄올");
        assertThat(ExcludeCode.SYNTHETIC_COLORANTS.ingredientNames()).hasSize(84)
                .contains("황색4호", "적색103호의(1)", "염기성황색57호", "피그먼트녹색7호");
    }

    @Test
    void 승인한_합성_색소_목록_전체를_고정한다() throws NoSuchAlgorithmException {
        String joined = String.join("\n", ExcludeCode.SYNTHETIC_COLORANTS.ingredientNames());
        String fingerprint = HexFormat.of()
                .formatHex(MessageDigest.getInstance("SHA-256").digest(joined.getBytes(StandardCharsets.UTF_8)));

        assertThat(fingerprint).isEqualTo("9af3090a3ab8b95facc390d5c138a9159f0f9adad176b6a553383b5ce9129559");
    }
}
