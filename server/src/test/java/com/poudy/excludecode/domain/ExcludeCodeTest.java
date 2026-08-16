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
    void 향료_알레르기_성분군은_승인한_성분명을_가진다() {
        assertThat(ExcludeCode.FRAGRANCE_ALLERGENS.ingredientNames()).containsExactly(
                "향료",
                "리날룰",
                "리모넨",
                "시트랄",
                "시트로넬올",
                "제라니올",
                "부틸페닐메틸프로피오날",
                "벤질살리실레이트",
                "알파-아이소메틸아이오논",
                "헥실신남알",
                "유제놀",
                "아밀신남알",
                "쿠마린");
    }

    @Test
    void 건조_알코올_성분군은_승인한_성분명을_가진다() {
        assertThat(ExcludeCode.DRYING_ALCOHOLS.ingredientNames())
                .containsExactly("변성알코올", "에탄올", "아이소프로필알코올", "에스디알코올40-B");
    }

    @Test
    void 자극성_방부제_성분군은_승인한_성분명을_가진다() {
        assertThat(ExcludeCode.HARSH_PRESERVATIVES.ingredientNames()).containsExactly(
                "페녹시에탄올",
                "메틸파라벤",
                "에틸파라벤",
                "프로필파라벤",
                "부틸파라벤",
                "아이소부틸파라벤",
                "아이소프로필파라벤",
                "비에이치에이",
                "비에이치티",
                "디엠디엠하이단토인");
    }

    @Test
    void 설페이트_성분군은_승인한_성분명을_가진다() {
        assertThat(ExcludeCode.SULFATES.ingredientNames())
                .containsExactly("소듐라우릴설페이트", "소듐라우레스설페이트", "암모늄라우릴설페이트", "암모늄라우레스설페이트");
    }

    @Test
    void 실리콘_자극원_성분군은_승인한_성분명을_가진다() {
        assertThat(ExcludeCode.CYCLIC_SILICONES.ingredientNames())
                .containsExactly("사이클로테트라실록세인", "사이클로펜타실록세인", "사이클로헥사실록세인", "사이클로메티콘");
    }

    @Test
    void 합성_색소_성분군은_승인한_84개를_가진다() {
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
