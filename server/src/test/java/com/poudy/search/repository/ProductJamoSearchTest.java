package com.poudy.search.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@Sql({"/db/search-test-data.sql", "/db/product-jamo-search-test-data.sql"})
@DisplayName("상품 검색의 조합·분리 입력")
class ProductJamoSearchTest {

    // 음절 끝 표시. 상품 검색 자모열에서 음절 하나가 끝났음을 나타낸다.
    private static final String END = chars(0x3164);
    private static final String INITIALS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
    // 중성 21개를 기본 자모로 푼 모양. 복합모음만 두 자모다.
    private static final String[] MEDIALS = "ㅏ ㅐ ㅑ ㅒ ㅓ ㅔ ㅕ ㅖ ㅗ ㅗㅏ ㅗㅐ ㅗㅣ ㅛ ㅜ ㅜㅓ ㅜㅔ ㅜㅣ ㅠ ㅡ ㅡㅣ ㅣ".split(" ");
    // 받침 없음과 종성 27개를 기본 자모로 푼 모양. 겹받침만 두 자모다.
    private static final String[] FINALS = " ㄱ ㄲ ㄱㅅ ㄴ ㄴㅈ ㄴㅎ ㄷ ㄹ ㄹㄱ ㄹㅁ ㄹㅂ ㄹㅅ ㄹㅌ ㄹㅍ ㄹㅎ ㅁ ㅂ ㅂㅅ ㅅ ㅆ ㅇ ㅈ ㅊ ㅋ ㅌ ㅍ ㅎ"
        .split(" ");
    // 받침 자리의 호환 자모 순서. 조합형 종성(U+11A8~)도 이 순서다.
    private static final String FINAL_ORDER = "ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";

    @Autowired
    private JdbcTemplate jdbc;

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "젤리크림|젤리크리ㅁ",
            "젤리크림|젤리ㅋㅡ림",
            "젤리크림|젤리ㅋㅡㄹㅣㅁ",
            "젤리크림|ㅈㅔㄹ리크림",
            "젤리크림|ㅈㅔㄹㄹㅣㅋㅡㄹㅣㅁ",
            "크림|ㅋㅡㄹㅣㅁ",
            "크림|크리ㅁ",
            "젤리수분크림|젤리수ㅂㅜㄴ크림",
            "젤리과일|젤리고ㅏ일",
            "젤리과일|젤리ㄱㅘ일",
            "젤리과일|젤리ㄱㅗㅏ일",
            "젤리닭가슴살|젤리달ㄱ가슴살",
            "젤리닭가슴살|젤리ㄷㅏㄺ가슴살",
            "젤리닭가슴살|젤리ㄷㅏㄹㄱ가슴살",
            "자모브랜드 젤리크림|자모브랜드 젤리ㅋㅡ림",
            "자모브랜드젤리과일|자모브랜드젤리고ㅏ일",
            "젤리 피디알엔|젤리 ㅍㅣ디알엔"
    })
    @DisplayName("붙여 쓴 입력과 자모를 나눠 쓴 입력은 같은 상품, 등급, 순서와 강조 구간을 돌려준다")
    void treatsSplitJamoAsComposed(String composed, String split) {
        assertThat(page(composed, 20, 3).get("items")).isNotEqualTo("[]");
        assertThat(page(split, 20, 3)).isEqualTo(page(composed, 20, 3));
        assertThat(page(split, null, 2)).isEqualTo(page(composed, null, 2));
    }

    @Test
    @DisplayName("NFD로 분해한 한글과 NFC로 합쳐지지 않는 조합형 자모 입력도 같게 본다")
    void treatsDecomposedInputAsComposed() {
        String nfd = Normalizer.normalize("젤리크림", Normalizer.Form.NFD);
        // 과를 초성 ㄱ, 중성 ㅗ, 중성 ㅏ 세 글자로 쓴 입력. NFC 는 중성 둘을 ㅘ 로 합치지 않는다.
        String conjoining = chars(
            0x110c,
            0x1166,
            0x11af,
            0x1105,
            0x1175,
            0x1100,
            0x1169,
            0x1161,
            0x110b,
            0x1175,
            0x11af
        );
        assertThat(page(nfd, 20, 3)).isEqualTo(page("젤리크림", 20, 3));
        assertThat(page(conjoining, 20, 3)).isEqualTo(page("젤리과일", 20, 3));
    }

    @Test
    @DisplayName("한 글자만 달라도 다른 입력이고, 모음이 빠진 초성·음절 혼합 입력은 일반 검색에서 맞지 않는다")
    void distinguishesDifferentLetters() {
        assertThat(coreIds("젤리크램")).contains(90102L).doesNotContain(90101L);
        assertThat(coreIds("젤리크림")).contains(90101L).doesNotContain(90102L);
        assertThat(coreIds("ㅋ림")).isEmpty();
        assertThat(coreIds("젤리ㅋ림")).doesNotContain(90101L, 90107L);
        assertThat(coreIds("ㅈㄹㅋㄹ")).contains(90101L);
    }

    @Test
    @DisplayName("받침과 다음 음절 초성의 경계, 브랜드명과 상품명의 경계에서만 맞는 가짜 결과는 뺀다")
    void rejectsBoundaryMatches() {
        assertThat(coreIds("젤리닭")).doesNotContain(90106L);
        assertThat(coreIds("젤리달고")).contains(90106L).doesNotContain(90105L);
        assertThat(coreIds("크림")).doesNotContain(90109L);
        assertThat(coreIds("ㅋㅡㄹㅣㅁ")).doesNotContain(90109L);
    }

    @Test
    @DisplayName("덜 쓴 음절, 복합모음과 겹받침을 쓰는 중인 입력은 아직 넓혀 찾지 않는다")
    void doesNotInterpretIncompleteInput() {
        assertThat(coreIds("젤리고")).doesNotContain(90104L);
        assertThat(coreIds("젤리달")).doesNotContain(90105L);
        assertThat(coreIds("젤리클")).contains(90108L).doesNotContain(90101L);
        assertThat(coreIds("젤리크리")).contains(90103L).doesNotContain(90101L);
        assertThat(coreIds("젤리크ㄹ")).contains(90108L).doesNotContain(90101L, 90103L);
    }

    @Test
    @DisplayName("찾은 이유에 직접 일치, 실제로 맞은 이름과 UTF-16 위치를 남긴다")
    void recordsDirectMatchEvidence() {
        String evidence = "select match_reason, match_field, match_text, match_start, match_end"
            + " from product_search_matches(?) where product_id = 90110";
        assertThat(jdbc.queryForMap(evidence, "젤리 ㅍㅣ디알엔"))
            .isEqualTo(jdbc.queryForMap(evidence, "젤리 피디알엔"))
            .containsEntry("match_reason", 0)
            .containsEntry("match_field", "PRODUCT_NAME")
            .containsEntry("match_text", "젤리 PDRN 앰플");
        assertThat(jdbc.queryForMap(evidence.replace("90110", "90101"), "젤리ㅋㅡ림"))
            .containsEntry("match_start", 0)
            .containsEntry("match_end", 4);
    }

    @Test
    @DisplayName("원본 이름을 바꾸고 검색 뷰를 갱신하면 자모와 강조 구간도 바뀐다")
    void refreshesJamoColumns() {
        jdbc.update("update product set product_name = '젤리과자' where id = 90104");
        assertThat(coreIds("젤리고ㅏ자")).isEmpty();
        jdbc.execute("refresh materialized view product_search_document");
        assertThat(coreIds("젤리고ㅏ자")).containsExactly(90104L);
        assertThat(
            jdbc.queryForObject(
                "select items->0->'matchRange' from search_products('젤리고ㅏ자', 0, 5)",
                String.class
            )
        ).isEqualTo("[0, 4]");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "select total, items from search_products('젤리ㅋㅡ림')",
            "select total, items from search_products('젤리ㅋㅡ림', 0)",
            "select total, items from search_products('젤리ㅋㅡ림', 0, 5)",
            "select total, items from search_products('젤리ㅋㅡ림', 0, 5, 3)"
    })
    @DisplayName("이전 서버가 값을 1~4개 넘기는 호출과 결과 모양을 유지한다")
    void keepsLegacyCalls(String sql) {
        Map<String, Object> row = jdbc.queryForMap(sql);
        assertThat(row).containsOnlyKeys("total", "items").containsEntry("total", 1L);
        assertThat(
            jdbc.queryForList(
                "select distinct k from (" + sql
                    + ") r, jsonb_array_elements(r.items) e, jsonb_object_keys(e) k order by k",
                String.class
            )
        ).containsExactly(
            "matchField",
            "matchRange",
            "matchText",
            "productId",
            "rank",
            "recentViews",
            "tier",
            "tokenRatio"
        );
    }

    @Test
    @DisplayName("공유 텍스트 매칭과 오타 교정은 기존 규칙을 그대로 쓴다")
    void keepsSharedMatchingAndCorrection() {
        assertThat(
            jdbc.queryForList(
                "select product_id from search_product_names('젤리크림', 90100)",
                Long.class
            )
        ).containsExactly(90101L);
        assertThat(
            jdbc.queryForList(
                "select product_id from search_product_names('젤리ㅋㅡ림', 90100)",
                Long.class
            )
        ).isEmpty();
        assertThat(jdbc.queryForObject("select search_correct_query('검증스내일', 'PRODUCT')", String.class))
            .isEqualTo("검증스네일");
    }

    @Test
    @DisplayName("복합모음과 겹받침을 정해진 기본 자모로 나눈다")
    void splitsCompoundJamo() {
        assertThat(text("select product_search_jamo('와')")).isEqualTo(chars(0x110b, 0x1169, 0x1161) + END);
        assertThat(text("select product_search_jamo('의')")).isEqualTo(chars(0x110b, 0x1173, 0x1175) + END);
        assertThat(text("select product_search_jamo('닭')")).isEqualTo(chars(0x1103, 0x1161, 0x11af, 0x11a8) + END);
        assertThat(text("select product_search_jamo('값')")).isEqualTo(chars(0x1100, 0x1161, 0x11b8, 0x11ba) + END);
        assertThat(text("select product_search_jamo('빵')")).isEqualTo(chars(0x1108, 0x1161, 0x11bc) + END);
        assertThat(text("select product_search_jamo('PDRN 크림')"))
            .isEqualTo("pdrn" + chars(0x110f, 0x1173) + END + chars(0x1105, 0x1175, 0x11b7) + END);
    }

    @Test
    @DisplayName("현대 한글 완성형 전체를 기본 자모로 나눴다가 다시 합치면 원래 음절과 음절 경계가 나온다")
    void roundTripsEveryModernSyllable() {
        List<String> syllables = IntStream.range(0, 11172).mapToObj(i -> String.valueOf((char) (0xAC00 + i))).toList();
        List<String> mismatches = new ArrayList<>();
        List<String> jamo = batch("product_search_jamo", syllables);
        List<String> fromJamo = batch("product_search_compose", jamo);
        List<String> fromCompatibility = batch(
            "product_search_compose",
            syllables.stream().map(ProductJamoSearchTest::compatibility).toList()
        );
        List<String> pairs = syllables.stream().map(s -> s + "가").toList();
        List<String> fromPairs = batch(
            "product_search_compose",
            pairs.stream().map(ProductJamoSearchTest::compatibility).toList()
        );
        for (int i = 0; i < syllables.size(); i++) {
            String syllable = syllables.get(i);
            if (!jamo.get(i).equals(conjoining(syllable))) {
                mismatches.add("jamo " + syllable + " -> " + jamo.get(i));
            }
            if (!fromJamo.get(i).equals(syllable) || !fromCompatibility.get(i).equals(syllable)) {
                mismatches.add("compose " + syllable + " -> " + fromJamo.get(i) + ", " + fromCompatibility.get(i));
            }
            if (!fromPairs.get(i).equals(pairs.get(i))) {
                mismatches.add("boundary " + pairs.get(i) + " -> " + fromPairs.get(i));
            }
        }
        assertThat(mismatches).isEmpty();
    }

    private Map<String, Object> page(String query, Integer limit, int maxTier) {
        return jdbc.queryForMap(
            "select total, corrected_query, items::text as items from search_products(?, 0, ?, ?)",
            query,
            limit,
            maxTier
        );
    }

    private List<Long> coreIds(String query) {
        return jdbc
            .queryForList("select product_id from search_products_core(?) order by product_id", Long.class, query);
    }

    private List<String> batch(String function, List<String> values) {
        return List.of(
            jdbc.queryForObject(
                "select string_agg(" + function + "(u.v), E'\\n' order by u.i)"
                    + " from regexp_split_to_table(?, E'\\n') with ordinality u(v, i)",
                String.class,
                String.join("\n", values)
            ).split("\n", -1)
        );
    }

    private static String chars(int... codePoints) {
        return new String(codePoints, 0, codePoints.length);
    }

    private String text(String sql) {
        return jdbc.queryForObject(sql, String.class);
    }

    // 음절을 호환 자모 기본 자모열로 푼다(닭 → ㄷㅏㄹㄱ). DB 구현과 따로 만든 기대값이다.
    private static String compatibility(String text) {
        StringBuilder result = new StringBuilder();
        for (char c : text.toCharArray()) {
            int index = c - 0xAC00;
            result.append(INITIALS.charAt(index / 588)).append(MEDIALS[index % 588 / 28]).append(FINALS[index % 28]);
        }
        return result.toString();
    }

    // 음절을 역할별 조합형 자모와 음절 끝 표시로 푼다(닭 → 초성 ㄷ, 중성 ㅏ, 종성 ㄹ, 종성 ㄱ, 끝 표시).
    private static String conjoining(String syllable) {
        int index = syllable.charAt(0) - 0xAC00;
        StringBuilder result = new StringBuilder().append((char) (0x1100 + index / 588));
        for (char medial : MEDIALS[index % 588 / 28].toCharArray()) {
            result.append((char) (0x1161 + medial - 'ㅏ'));
        }
        for (char last : FINALS[index % 28].toCharArray()) {
            result.append((char) (0x11A8 + FINAL_ORDER.indexOf(last)));
        }
        return result.append(END).toString();
    }
}
