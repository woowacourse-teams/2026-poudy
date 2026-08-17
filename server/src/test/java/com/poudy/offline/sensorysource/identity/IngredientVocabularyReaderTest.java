package com.poudy.offline.sensorysource.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.offline.sensorysource.IngredientResolution.Resolved;
import com.poudy.offline.sensorysource.IngredientResolution.Unresolved;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Objects;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

@DisplayName("오프라인 성분 vocabulary reader")
class IngredientVocabularyReaderTest {

    @TempDir
    Path tempDirectory;

    @Test
    @DisplayName("현재 ingredients.json의 ID, 한글명, 영문명과 별칭 구조를 읽는다")
    void readsCurrentIngredientsJsonShape() throws IOException {
        Path ingredientsJson = write("""
                {
                  "ingredients": [
                    {
                      "id": 10,
                      "korean_name": "글리세린",
                      "english_name": "Glycerin",
                      "aliases": ["글리세롤"],
                      "description": "resolver 입력이 아닌 필드는 보존하지 않는다",
                      "tag_mappings": []
                    },
                    {
                      "id": 20,
                      "korean_name": "향료",
                      "aliases": []
                    }
                  ]
                }
                """);

        IngredientIdentityResolver resolver = IngredientIdentityResolver.fromIngredientsJson(ingredientsJson);

        assertThat(resolver.resolve(null, "글리세롤"))
                .isEqualTo(
                        new Resolved(
                                10L,
                                IngredientIdentityResolver.MatchRule.ALIAS_EXACT.name(),
                                IngredientIdentityResolver.VERSION));
        assertThat(resolver.resolve(null, "향료"))
                .isEqualTo(
                        new Resolved(
                                20L,
                                IngredientIdentityResolver.MatchRule.KOREAN_NAME_EXACT.name(),
                                IngredientIdentityResolver.VERSION));
    }

    @Test
    @DisplayName("실제 catalog fixture의 comma 영문 표기를 각각 exact 이름으로 해석한다")
    void resolvesCommaSeparatedEnglishNamesFromCatalogFixture() throws IOException {
        IngredientIdentityResolver resolver = IngredientIdentityResolver.fromIngredientsJson(fixtureSnapshot());

        assertThat(resolver.resolve(null, "Parfum"))
                .isEqualTo(
                        new Resolved(
                                4815L,
                                IngredientIdentityResolver.MatchRule.ENGLISH_NAME_EXACT.name(),
                                IngredientIdentityResolver.VERSION));
        assertThat(resolver.resolve(null, "CI 60725"))
                .isEqualTo(
                        new Resolved(
                                2597L,
                                IngredientIdentityResolver.MatchRule.ENGLISH_NAME_EXACT.name(),
                                IngredientIdentityResolver.VERSION));
    }

    @Test
    @DisplayName("숫자와 letter locant comma 및 slash는 이름 내부 구조로 보존한다")
    void preservesLocantCommasAndSlashesWhileSplittingKnownEnglishNameDelimiter() throws IOException {
        Path ingredientsJson = write("""
                {
                  "ingredients": [
                    {
                      "id": 4840,
                      "korean_name": "1,2-헥산다이올",
                      "english_name": "1,2-Hexanediol",
                      "aliases": []
                    },
                    {
                      "id": 18574,
                      "korean_name": "N,N-비스 화합물",
                      "english_name": "N,N-Bis(2-Hydroxyethyl)-p-Phenylenediamine Sulfate",
                      "aliases": []
                    },
                    {
                      "id": 8295,
                      "korean_name": "피이지-400/1,4-부탄다이올/에스엠디아이코폴리머",
                      "english_name": "PEG-400/1,4-Butanediol/SMDI Copolymer",
                      "aliases": []
                    },
                    {
                      "id": 10160,
                      "korean_name": "라우라마이드/미리스타마이드디이에이",
                      "english_name": "Lauramide/Myristamide DEA,Lauroyl Myristoyl Diethanolamide",
                      "aliases": []
                    },
                    {
                      "id": 18575,
                      "korean_name": "문자 locant 화합물",
                      "english_name": "R,S-Stereoisomer,E,Z-Isomer,C,C'-Linked Compound,n,n-Lowercase Locant",
                      "aliases": []
                    }
                  ]
                }
                """);

        List<IngredientVocabularyEntry> entries = new IngredientVocabularyReader().read(ingredientsJson);
        assertThat(entries.get(0).englishNames()).containsExactly("1,2-Hexanediol");
        assertThat(entries.get(1).englishNames())
                .containsExactly("N,N-Bis(2-Hydroxyethyl)-p-Phenylenediamine Sulfate");
        assertThat(entries.get(2).englishNames())
                .containsExactly("PEG-400/1,4-Butanediol/SMDI Copolymer");
        assertThat(entries.get(3).englishNames())
                .containsExactly("Lauramide/Myristamide DEA", "Lauroyl Myristoyl Diethanolamide");
        assertThat(entries.get(4).englishNames())
                .containsExactly(
                        "R,S-Stereoisomer",
                        "E,Z-Isomer",
                        "C,C'-Linked Compound",
                        "n,n-Lowercase Locant");

        IngredientIdentityResolver resolver = new IngredientIdentityResolver(entries);
        assertThat(resolver.resolve(null, "1,2-Hexanediol"))
                .isEqualTo(resolved(4840L, IngredientIdentityResolver.MatchRule.ENGLISH_NAME_EXACT));
        assertThat(resolver.resolve(null, "N,N-Bis(2-Hydroxyethyl)-p-Phenylenediamine Sulfate"))
                .isEqualTo(resolved(18574L, IngredientIdentityResolver.MatchRule.ENGLISH_NAME_EXACT));
        assertThat(resolver.resolve(null, "PEG-400/1,4-Butanediol/SMDI Copolymer"))
                .isEqualTo(resolved(8295L, IngredientIdentityResolver.MatchRule.ENGLISH_NAME_EXACT));
        assertThat(resolver.resolve(null, "Lauramide/Myristamide DEA"))
                .isEqualTo(resolved(10160L, IngredientIdentityResolver.MatchRule.ENGLISH_NAME_EXACT));
        assertThat(resolver.resolve(null, "Lauroyl Myristoyl Diethanolamide"))
                .isEqualTo(resolved(10160L, IngredientIdentityResolver.MatchRule.ENGLISH_NAME_EXACT));
        assertThat(resolver.resolve(null, "R,S-Stereoisomer"))
                .isEqualTo(resolved(18575L, IngredientIdentityResolver.MatchRule.ENGLISH_NAME_EXACT));
        assertThat(resolver.resolve(null, "n,n-Lowercase Locant"))
                .isEqualTo(resolved(18575L, IngredientIdentityResolver.MatchRule.ENGLISH_NAME_EXACT));
        assertThat(resolver.resolve(null, "Lauramide"))
                .isEqualTo(
                        new Unresolved(
                                IngredientIdentityResolver.UnresolvedReason.NORMALIZED_EXACT_NAME_NOT_FOUND.name(),
                                IngredientIdentityResolver.VERSION));
    }

    @Test
    @DisplayName("producer가 locant comma에서 잘못 자른 alias 조각을 격리한다")
    void quarantinesProducerSplitAliasFragments() throws IOException {
        Path ingredientsJson = write("""
                {
                  "ingredients": [
                    {
                      "id": 8295,
                      "korean_name": "피이지-400/1,4-부탄다이올/에스엠디아이코폴리머",
                      "english_name": "PEG-400/1,4-Butanediol/SMDI Copolymer",
                      "aliases": [
                        "피이지-400/1",
                        "4-부탄디올/에스엠디아이코폴리머"
                      ]
                    }
                  ]
                }
                """);

        IngredientIdentityResolver resolver = IngredientIdentityResolver.fromIngredientsJson(ingredientsJson);

        assertThat(resolver.resolve(null, "피이지-400/1,4-부탄다이올/에스엠디아이코폴리머"))
                .isEqualTo(resolved(8295L, IngredientIdentityResolver.MatchRule.KOREAN_NAME_EXACT));
        assertThat(resolver.resolve(null, "피이지-400/1"))
                .isInstanceOf(Unresolved.class);
        assertThat(resolver.resolve(null, "4-부탄디올/에스엠디아이코폴리머"))
                .isInstanceOf(Unresolved.class);
        assertThat(resolver.diagnostics())
                .containsExactly(
                        new IngredientVocabularyIssue(
                                8295L,
                                IngredientVocabularyIssue.Type.SUSPECTED_LOCANT_COMMA_SPLIT_ALIAS_FRAGMENTS,
                                List.of("피이지-400/1", "4-부탄디올/에스엠디아이코폴리머")));
    }

    @Test
    @DisplayName("공통 왼쪽 locant 조각이 de-dup된 연속 우측 sibling도 함께 격리한다")
    void quarantinesConsecutiveRightLocantSiblings() throws IOException {
        Path ingredientsJson = write("""
                {
                  "ingredients": [
                    {
                      "id": 18552,
                      "korean_name": "1,5-디히드록시나프탈렌",
                      "english_name": "1,5-Naphthalenediol",
                      "aliases": [
                        "1",
                        "5-나프탈렌다이올",
                        "5-나프탈렌디올",
                        "정상별칭"
                      ]
                    }
                  ]
                }
                """);

        IngredientIdentityResolver resolver = IngredientIdentityResolver.fromIngredientsJson(ingredientsJson);

        assertThat(resolver.resolve(null, "5-나프탈렌다이올"))
                .isInstanceOf(Unresolved.class);
        assertThat(resolver.resolve(null, "5-나프탈렌디올"))
                .isInstanceOf(Unresolved.class);
        assertThat(resolver.resolve(null, "정상별칭"))
                .isEqualTo(resolved(18552L, IngredientIdentityResolver.MatchRule.ALIAS_EXACT));
        assertThat(resolver.diagnostics())
                .containsExactly(
                        new IngredientVocabularyIssue(
                                18552L,
                                IngredientVocabularyIssue.Type.SUSPECTED_LOCANT_COMMA_SPLIT_ALIAS_FRAGMENTS,
                                List.of("1", "5-나프탈렌다이올", "5-나프탈렌디올")));
    }

    @Test
    @DisplayName("연속 locant 조각과 단일 locant 토큰 및 caret 조각만 격리하고 정상 alias는 유지한다")
    void quarantinesEverySupportedAliasArtifactPattern() throws IOException {
        Path ingredientsJson = write("""
                {
                  "ingredients": [
                    {
                      "id": 18574,
                      "korean_name": "N,N-비스 화합물",
                      "english_name": "N,N-Bis Compound",
                      "aliases": ["N", "N-비스 화합물", "정상별칭"]
                    },
                    {
                      "id": 686,
                      "korean_name": "긴 공식 성분명",
                      "english_name": "Long Official Ingredient Name",
                      "aliases": ["첫 표기^두 번째 표기"]
                    }
                  ]
                }
                """);

        IngredientIdentityResolver resolver = IngredientIdentityResolver.fromIngredientsJson(ingredientsJson);

        assertThat(resolver.resolve(null, "정상별칭"))
                .isEqualTo(resolved(18574L, IngredientIdentityResolver.MatchRule.ALIAS_EXACT));
        assertThat(resolver.resolve(null, "N"))
                .isInstanceOf(Unresolved.class);
        assertThat(resolver.resolve(null, "N-비스 화합물"))
                .isInstanceOf(Unresolved.class);
        assertThat(resolver.resolve(null, "첫 표기^두 번째 표기"))
                .isInstanceOf(Unresolved.class);
        assertThat(resolver.diagnostics())
                .containsExactly(
                        new IngredientVocabularyIssue(
                                686L,
                                IngredientVocabularyIssue.Type.UNSUPPORTED_ALIAS_SEPARATOR,
                                List.of("첫 표기^두 번째 표기")),
                        new IngredientVocabularyIssue(
                                18574L,
                                IngredientVocabularyIssue.Type.SUSPECTED_LOCANT_COMMA_SPLIT_ALIAS_FRAGMENTS,
                                List.of("N", "N-비스 화합물")));
    }

    @Test
    @DisplayName("중복 ID를 자동 선택하지 않고 입력 결함으로 거부한다")
    void rejectsDuplicateIds() throws IOException {
        Path ingredientsJson = write("""
                {
                  "ingredients": [
                    {"id": 10, "korean_name": "글리세린", "aliases": []},
                    {"id": 10, "korean_name": "다른 글리세린", "aliases": []}
                  ]
                }
                """);

        assertThatThrownBy(() -> IngredientIdentityResolver.fromIngredientsJson(ingredientsJson))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ingredients[1]")
                .hasMessageContaining("중복 canonical ingredient ID")
                .hasMessageContaining("10");
    }

    @Test
    @DisplayName("성분 배열과 vocabulary 필드의 잘못된 타입을 조용히 누락하지 않는다")
    void rejectsMalformedVocabulary() throws IOException {
        Path wrongRoot = write("{\"ingredients\": {}}");
        assertThatThrownBy(() -> IngredientIdentityResolver.fromIngredientsJson(wrongRoot))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ingredients는 배열");

        Path wrongAliases = write("""
                {
                  "ingredients": [
                    {"id": 10, "korean_name": "글리세린", "aliases": "글리세롤"}
                  ]
                }
                """);
        assertThatThrownBy(() -> IngredientIdentityResolver.fromIngredientsJson(wrongAliases))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ingredients[0]")
                .hasMessageContaining("aliases는 배열");

        Path whitespaceAlias = write("""
                {
                  "ingredients": [
                    {"id": 10, "korean_name": "글리세린", "aliases": ["\u00a0"]}
                  ]
                }
                """);
        assertThatThrownBy(() -> IngredientIdentityResolver.fromIngredientsJson(whitespaceAlias))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ingredients[0]")
                .hasMessageContaining("aliases의 각 값");

        Path emptyEnglishNameSegment = write("""
                {
                  "ingredients": [
                    {"id": 10, "korean_name": "글리세린", "english_name": "Glycerin,,Glycerol"}
                  ]
                }
                """);
        assertThatThrownBy(() -> IngredientIdentityResolver.fromIngredientsJson(emptyEnglishNameSegment))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ingredients[0]")
                .hasMessageContaining("english_name의 쉼표 구분 항목");
    }

    private static Resolved resolved(long ingredientId, IngredientIdentityResolver.MatchRule rule) {
        return new Resolved(ingredientId, rule.name(), IngredientIdentityResolver.VERSION);
    }

    private static byte[] fixtureSnapshot() throws IOException {
        try (InputStream input = Objects.requireNonNull(
                IngredientVocabularyReaderTest.class.getResourceAsStream("/ingredients.json"))) {
            return input.readAllBytes();
        }
    }

    private Path write(String json) throws IOException {
        Path ingredientsJson = tempDirectory.resolve("ingredients.json");
        return Files.writeString(ingredientsJson, json);
    }
}
