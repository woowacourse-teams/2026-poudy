package com.poudy.offline.sensorysource.identity;

import java.io.IOException;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

final class IngredientVocabularyReader {

    private static final ObjectMapper MAPPER = JsonMapper.builder().build();

    List<IngredientVocabularyEntry> read(byte[] snapshot) throws IOException {
        JsonNode document = MAPPER.readTree(snapshot);
        JsonNode ingredients = document == null ? null : document.get("ingredients");
        if (ingredients == null || !ingredients.isArray()) {
            throw new IllegalArgumentException("ingredients.json의 최상위 ingredients는 배열이어야 합니다.");
        }

        List<IngredientVocabularyEntry> entries = new ArrayList<>(ingredients.size());
        Set<Long> ids = new HashSet<>();
        int index = 0;
        for (JsonNode ingredient : ingredients) {
            if (!ingredient.isObject()) {
                throw invalid(index, "성분은 객체여야 합니다.");
            }

            long id = positiveLong(ingredient.get("id"), index);
            if (!ids.add(id)) {
                throw invalid(index, "중복 canonical ingredient ID입니다: " + id);
            }

            AliasInspection aliasInspection = aliases(ingredient.get("aliases"), index, id);
            entries.add(
                    new IngredientVocabularyEntry(
                            id,
                            requiredText(ingredient.get("korean_name"), index, "korean_name"),
                            englishNames(ingredient.get("english_name"), index),
                            aliasInspection.accepted(),
                            aliasInspection.issues()));
            index++;
        }
        return List.copyOf(entries);
    }

    private static long positiveLong(JsonNode value, int index) {
        if (value == null || !value.isIntegralNumber()) {
            throw invalid(index, "id는 양의 정수여야 합니다.");
        }

        BigInteger number = value.bigIntegerValue();
        if (number.signum() <= 0 || number.compareTo(BigInteger.valueOf(Long.MAX_VALUE)) > 0) {
            throw invalid(index, "id는 long 범위의 양수여야 합니다.");
        }
        return number.longValue();
    }

    private static String requiredText(JsonNode value, int index, String field) {
        String text = optionalText(value, index, field);
        if (IngredientIdentityResolver.normalize(text).isEmpty()) {
            throw invalid(index, field + "는 비어 있을 수 없습니다.");
        }
        return text;
    }

    private static String optionalText(JsonNode value, int index, String field) {
        if (value == null || value.isNull()) {
            return "";
        }
        if (!value.isString()) {
            throw invalid(index, field + "는 문자열이어야 합니다.");
        }
        String text = value.stringValue();
        if (!text.isEmpty() && IngredientIdentityResolver.normalize(text).isEmpty()) {
            throw invalid(index, field + "는 공백만 가질 수 없습니다.");
        }
        return text;
    }

    private static List<String> englishNames(JsonNode value, int index) {
        String namesAsPublished = optionalText(value, index, "english_name");
        if (namesAsPublished.isEmpty()) {
            return List.of();
        }

        // 현재 catalog의 복수 영문 표기 delimiter만 쉼표다. 숫자 및 단일 ASCII letter locant의
        // 내부 쉼표는 유지하고, slash를 비롯한 다른 문자는 공식 이름 구조로 그대로 둔다.
        List<String> names = new ArrayList<>();
        int segmentStart = 0;
        for (int cursor = 0; cursor < namesAsPublished.length(); cursor++) {
            if (namesAsPublished.charAt(cursor) != ',' || isLocantComma(namesAsPublished, cursor)) {
                continue;
            }

            names.add(englishNameSegment(namesAsPublished, segmentStart, cursor, index));
            segmentStart = cursor + 1;
        }
        names.add(englishNameSegment(namesAsPublished, segmentStart, namesAsPublished.length(), index));
        return List.copyOf(names);
    }

    private static String englishNameSegment(String value, int start, int end, int index) {
        String segment = value.substring(start, end).strip();
        if (IngredientIdentityResolver.normalize(segment).isEmpty()) {
            throw invalid(index, "english_name의 쉼표 구분 항목은 비어 있을 수 없습니다.");
        }
        return segment;
    }

    private static boolean isLocantComma(String value, int commaIndex) {
        return isLocantComma(value, commaIndex, true);
    }

    private static boolean isLocantComma(String value, int commaIndex, boolean requireLetterBoundary) {
        int left = previousSignificant(value, commaIndex);
        int right = nextSignificant(value, commaIndex + 1);
        if (left < 0 || right >= value.length()) {
            return false;
        }
        if (Character.isDigit(value.charAt(left)) && Character.isDigit(value.charAt(right))) {
            return true;
        }
        return isLetterLocantComma(value, left, right, requireLetterBoundary);
    }

    private static boolean isLetterLocantComma(
            String value,
            int left,
            int right,
            boolean requireBoundary) {
        int leftLetter = previousSignificantOrPrime(value, left);
        if (leftLetter < 0 || !isLocantLetter(value.charAt(leftLetter)) || !isLocantLetter(value.charAt(right))) {
            return false;
        }
        if (requireBoundary && !hasLetterLocantBoundary(value, leftLetter)) {
            return false;
        }

        int afterRightLetter = nextSignificantOrPrime(value, right + 1);
        return afterRightLetter < value.length()
                && (value.charAt(afterRightLetter) == '-' || value.charAt(afterRightLetter) == ',');
    }

    private static boolean hasLetterLocantBoundary(String value, int letterIndex) {
        if (letterIndex == 0) {
            return true;
        }

        char previous = value.charAt(letterIndex - 1);
        return isSpace(previous)
                || previous == '-'
                || previous == '/'
                || previous == '('
                || previous == '['
                || previous == '{'
                || previous == ',';
    }

    private static int previousSignificant(String value, int fromExclusive) {
        int index = fromExclusive - 1;
        while (index >= 0 && isSpace(value.charAt(index))) {
            index--;
        }
        return index;
    }

    private static int nextSignificant(String value, int fromInclusive) {
        int index = fromInclusive;
        while (index < value.length() && isSpace(value.charAt(index))) {
            index++;
        }
        return index;
    }

    private static int previousSignificantOrPrime(String value, int fromInclusive) {
        int index = fromInclusive;
        while (index >= 0 && (isSpace(value.charAt(index)) || isPrime(value.charAt(index)))) {
            index--;
        }
        return index;
    }

    private static int nextSignificantOrPrime(String value, int fromInclusive) {
        int index = fromInclusive;
        while (index < value.length() && (isSpace(value.charAt(index)) || isPrime(value.charAt(index)))) {
            index++;
        }
        return index;
    }

    private static boolean isLocantLetter(char value) {
        char upperCase = Character.toUpperCase(value);
        return upperCase >= 'A' && upperCase <= 'Z';
    }

    private static boolean isPrime(char value) {
        return value == '\'' || value == '\u2032' || value == '\u2033';
    }

    private static boolean isSpace(char value) {
        return Character.isWhitespace(value) || Character.isSpaceChar(value);
    }

    private static AliasInspection aliases(JsonNode value, int index, long canonicalIngredientId) {
        if (value == null || value.isNull()) {
            return new AliasInspection(List.of(), List.of());
        }
        if (!value.isArray()) {
            throw invalid(index, "aliases는 배열이어야 합니다.");
        }

        List<String> aliases = new ArrayList<>(value.size());
        for (JsonNode alias : value) {
            if (!alias.isString() || IngredientIdentityResolver.normalize(alias.stringValue()).isEmpty()) {
                throw invalid(index, "aliases의 각 값은 비어 있지 않은 문자열이어야 합니다.");
            }
            aliases.add(alias.stringValue());
        }

        Set<Integer> locantFragments = suspectedCommaSplitAliasIndexes(aliases);
        Set<Integer> unsupportedSeparators = unsupportedAliasSeparatorIndexes(aliases);
        Set<Integer> excluded = new HashSet<>(locantFragments);
        excluded.addAll(unsupportedSeparators);
        if (excluded.isEmpty()) {
            return new AliasInspection(List.copyOf(aliases), List.of());
        }

        Set<String> excludedNames = excluded.stream()
                .map(aliases::get)
                .map(IngredientIdentityResolver::normalize)
                .collect(Collectors.toUnmodifiableSet());
        List<String> accepted = new ArrayList<>();
        for (int aliasIndex = 0; aliasIndex < aliases.size(); aliasIndex++) {
            if (!excludedNames.contains(IngredientIdentityResolver.normalize(aliases.get(aliasIndex)))) {
                accepted.add(aliases.get(aliasIndex));
            }
        }
        List<IngredientVocabularyIssue> issues = new ArrayList<>();
        addIssue(
                issues,
                canonicalIngredientId,
                IngredientVocabularyIssue.Type.SUSPECTED_LOCANT_COMMA_SPLIT_ALIAS_FRAGMENTS,
                aliases,
                locantFragments);
        addIssue(
                issues,
                canonicalIngredientId,
                IngredientVocabularyIssue.Type.UNSUPPORTED_ALIAS_SEPARATOR,
                aliases,
                unsupportedSeparators);
        return new AliasInspection(List.copyOf(accepted), List.copyOf(issues));
    }

    private static Set<Integer> suspectedCommaSplitAliasIndexes(List<String> aliases) {
        // Producer가 locant 쉼표에서 alias 배열을 이미 잘랐기 때문에 원형을 확정적으로
        // 복구할 수 없다. 추측해 재결합하지 않고 원문 조각을 diagnostic으로 격리한다.
        Set<Integer> excluded = new HashSet<>();
        for (int index = 0; index < aliases.size(); index++) {
            String alias = aliases.get(index);
            if (isStandaloneLocantToken(alias)) {
                excluded.add(index);
            }
            if (index + 1 >= aliases.size()) {
                continue;
            }

            String rejoined = alias + "," + aliases.get(index + 1);
            if (isLocantComma(rejoined, alias.length(), false)) {
                excluded.add(index);
                excluded.add(index + 1);

                String rightLocantPrefix = leadingLocantPrefix(aliases.get(index + 1));
                int siblingIndex = index + 2;
                while (!rightLocantPrefix.isEmpty()
                        && siblingIndex < aliases.size()
                        && rightLocantPrefix.equals(leadingLocantPrefix(aliases.get(siblingIndex)))) {
                    excluded.add(siblingIndex);
                    siblingIndex++;
                }
            }
        }
        return Set.copyOf(excluded);
    }

    private static String leadingLocantPrefix(String value) {
        int cursor = nextSignificant(value, 0);
        if (cursor >= value.length()) {
            return "";
        }

        StringBuilder prefix = new StringBuilder();
        char first = value.charAt(cursor);
        if (Character.isDigit(first)) {
            while (cursor < value.length() && Character.isDigit(value.charAt(cursor))) {
                prefix.append(value.charAt(cursor));
                cursor++;
            }
        } else if (isLocantLetter(first)) {
            prefix.append(first);
            cursor++;
            while (cursor < value.length() && isPrime(value.charAt(cursor))) {
                prefix.append(value.charAt(cursor));
                cursor++;
            }
        } else {
            return "";
        }

        cursor = nextSignificant(value, cursor);
        if (cursor >= value.length() || value.charAt(cursor) != '-') {
            return "";
        }
        prefix.append('-');
        return IngredientIdentityResolver.normalize(prefix.toString());
    }

    private static Set<Integer> unsupportedAliasSeparatorIndexes(List<String> aliases) {
        Set<Integer> excluded = new HashSet<>();
        for (int index = 0; index < aliases.size(); index++) {
            if (aliases.get(index).contains("^")) {
                excluded.add(index);
            }
        }
        return Set.copyOf(excluded);
    }

    private static void addIssue(
            List<IngredientVocabularyIssue> issues,
            long canonicalIngredientId,
            IngredientVocabularyIssue.Type type,
            List<String> aliases,
            Set<Integer> excludedIndexes) {
        if (excludedIndexes.isEmpty()) {
            return;
        }

        Set<String> excludedNames = excludedIndexes.stream()
                .map(aliases::get)
                .map(IngredientIdentityResolver::normalize)
                .collect(Collectors.toUnmodifiableSet());
        List<String> rawValues = aliases.stream()
                .filter(alias -> excludedNames.contains(IngredientIdentityResolver.normalize(alias)))
                .toList();
        issues.add(new IngredientVocabularyIssue(canonicalIngredientId, type, rawValues));
    }

    private static boolean isStandaloneLocantToken(String value) {
        String normalized = IngredientIdentityResolver.normalize(value);
        if (normalized.codePoints().allMatch(Character::isDigit)) {
            return true;
        }
        if (normalized.isEmpty() || !isLocantLetter(normalized.charAt(0))) {
            return false;
        }
        return normalized.substring(1).codePoints().allMatch(codePoint -> isPrime((char) codePoint));
    }

    private static IllegalArgumentException invalid(int index, String message) {
        return new IllegalArgumentException("ingredients[" + index + "]: " + message);
    }

    private record AliasInspection(
            List<String> accepted,
            List<IngredientVocabularyIssue> issues) {
    }
}
