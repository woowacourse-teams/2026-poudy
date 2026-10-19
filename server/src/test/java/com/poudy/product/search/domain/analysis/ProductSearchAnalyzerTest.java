package com.poudy.product.search.domain.analysis;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.product.search.domain.analysis.hangul.HangulComposer;
import java.text.Normalizer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ProductSearchAnalyzerTest {
    private final ProductSearchAnalyzer analyzer = new ProductSearchAnalyzer();

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "크림|크리ㅁ",
            "크림|ㅋㅡ림",
            "크림|ㅋㅡㄹㅣㅁ",
            "수분크림|수ㅂㅜㄴ크림",
            "과|고ㅏ",
            "과|ㄱㅘ",
            "과|ㄱㅗㅏ",
            "닭|달ㄱ",
            "닭|ㄷㅏㄺ",
            "닭|ㄷㅏㄹㄱ",
            "달기|닭ㅣ"})
    void composesEquivalentInputs(String composed, String split) {
        assertThat(analyzer.analyzeQuery(split).whole().expressions())
            .isEqualTo(analyzer.analyzeQuery(composed).whole().expressions());
    }

    @Test
    void preservesEveryModernSyllableAndFollowingBoundary() {
        String initials = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
        String[] vowels = "ㅏ ㅐ ㅑ ㅒ ㅓ ㅔ ㅕ ㅖ ㅗ ㅗㅏ ㅗㅐ ㅗㅣ ㅛ ㅜ ㅜㅓ ㅜㅔ ㅜㅣ ㅠ ㅡ ㅡㅣ ㅣ".split(" ");
        String[] finals = " ㄱ ㄲ ㄱㅅ ㄴ ㄴㅈ ㄴㅎ ㄷ ㄹ ㄹㄱ ㄹㅁ ㄹㅂ ㄹㅅ ㄹㅌ ㄹㅍ ㄹㅎ ㅁ ㅂ ㅂㅅ ㅅ ㅆ ㅇ ㅈ ㅊ ㅋ ㅌ ㅍ ㅎ".split(" ");
        HangulComposer composer = new HangulComposer();
        for (int i = 0; i < 11172; i++) {
            String syllable = String.valueOf((char) ('가' + i));
            String split = initials.charAt(i / 588) + vowels[i % 588 / 28] + finals[i % 28];
            assertThat(composer.compose(split).text()).as("음절 %s", syllable).isEqualTo(syllable);
            assertThat(composer.compose(split + "ㄱㅏ").text()).as("경계 %s", syllable).isEqualTo(syllable + "가");
            assertThat(composer.compose(Normalizer.normalize(syllable, Normalizer.Form.NFD)).text())
                .isEqualTo(syllable);
        }
    }

    @Test
    void keepsMissingVowelsAndSyllableBoundariesDistinct() {
        String cream = analyzer.analyzeQuery("크림").whole().expressions().getFirst();
        for (String different : new String[] {"ㅋ림", "크램", "크리", "클"}) {
            assertThat(cream).doesNotContain(analyzer.analyzeQuery(different).whole().expressions().getFirst());
        }
        assertThat(analyzer.analyzeQuery("달고").whole().expressions().getFirst())
            .doesNotContain(analyzer.analyzeQuery("닭").whole().expressions().getFirst());
    }

    @Test
    void mapsExpandedAndDecomposedNamesToOriginalUtf16Ranges() {
        var name = analyzer.analyzeName("🧴 젤리 PDRN 앰플");
        String needle = analyzer.analyzeQuery("피디알엔").whole().expressions().getFirst();
        int at = name.reading().text().indexOf(needle);
        assertThat(name.reading().sourceRange(at, at + needle.length())).containsExactly(6, 10);
        var split = analyzer.analyzeName("🧴 ㅋㅡㄹㅣㅁ");
        assertThat(split.direct().sourceRange(0, split.direct().length())).containsExactly(3, 8);
        assertThat(analyzer.analyzeName(Normalizer.normalize("크림 PDRN", Normalizer.Form.NFD)).reading().text())
            .isEqualTo(analyzer.analyzeName("크림 PDRN").reading().text());
    }

    @Test
    void keepsQueryAndNameReadingPoliciesAndTokenOrder() {
        assertThat(analyzer.analyzeQuery("E").whole().expressions()).containsExactly("e");
        assertThat(analyzer.analyzeName("PDRN").hasReading()).isFalse();
        var query = analyzer.analyzeQuery("크리ㅁ\u00a0토너 크림");
        assertThat(query.tokens()).extracting(t -> t.normalized()).containsExactly("크림", "토너");
    }
}
