package com.poudy.offline.sensorysource.identity;

import com.poudy.offline.sensorysource.IngredientResolution;
import com.poudy.offline.sensorysource.IngredientResolution.Ambiguous;
import com.poudy.offline.sensorysource.IngredientResolution.Resolved;
import com.poudy.offline.sensorysource.IngredientResolution.Unresolved;
import java.io.IOException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;

public final class IngredientIdentityResolver {

    public static final String VERSION = "ingredient-identity-resolver-v1";

    private final Set<Long> canonicalIngredientIds;
    private final Map<String, List<ExactNameCandidate>> exactNames;
    private final List<IngredientVocabularyIssue> diagnostics;

    public IngredientIdentityResolver(Collection<IngredientVocabularyEntry> vocabulary) {
        Objects.requireNonNull(vocabulary, "vocabulary");

        Set<Long> ids = new HashSet<>();
        Map<String, Map<Long, EnumSet<MatchRule>>> mutableExactNames = new HashMap<>();
        List<IngredientVocabularyIssue> mutableDiagnostics = new ArrayList<>();
        for (IngredientVocabularyEntry entry : vocabulary) {
            Objects.requireNonNull(entry, "vocabulary entry");
            if (!ids.add(entry.canonicalIngredientId())) {
                throw new IllegalArgumentException(
                        "중복 canonical ingredient ID입니다: " + entry.canonicalIngredientId());
            }

            index(mutableExactNames, entry.koreanName(), entry.canonicalIngredientId(), MatchRule.KOREAN_NAME_EXACT);
            for (String englishName : entry.englishNames()) {
                index(mutableExactNames, englishName, entry.canonicalIngredientId(), MatchRule.ENGLISH_NAME_EXACT);
            }
            for (String alias : entry.aliases()) {
                index(mutableExactNames, alias, entry.canonicalIngredientId(), MatchRule.ALIAS_EXACT);
            }
            mutableDiagnostics.addAll(entry.issues());
        }

        canonicalIngredientIds = Set.copyOf(ids);
        exactNames = immutableIndex(mutableExactNames);
        diagnostics = mutableDiagnostics.stream()
                .sorted(
                        Comparator.comparingLong(IngredientVocabularyIssue::canonicalIngredientId)
                                .thenComparing(issue -> issue.type().name())
                                .thenComparing(issue -> String.join("\u0000", issue.rawValues())))
                .toList();
    }

    public static IngredientIdentityResolver fromIngredientsJson(byte[] ingredientsJsonSnapshot) throws IOException {
        Objects.requireNonNull(ingredientsJsonSnapshot, "ingredientsJsonSnapshot");
        return new IngredientIdentityResolver(new IngredientVocabularyReader().read(ingredientsJsonSnapshot));
    }

    public IngredientResolution resolve(Long canonicalIngredientId, String nameAsPublished) {
        if (canonicalIngredientId != null && canonicalIngredientIds.contains(canonicalIngredientId)) {
            return new Resolved(canonicalIngredientId, MatchRule.CANONICAL_ID_DIRECT.name(), VERSION);
        }

        String normalizedName = normalize(nameAsPublished);
        if (normalizedName.isEmpty()) {
            UnresolvedReason reason = canonicalIngredientId == null
                    ? UnresolvedReason.MISSING_IDENTITY_INPUT
                    : UnresolvedReason.CANONICAL_ID_NOT_FOUND;
            return new Unresolved(reason.name(), VERSION);
        }

        List<ExactNameCandidate> candidates = exactNames.getOrDefault(normalizedName, List.of());
        if (candidates.isEmpty()) {
            UnresolvedReason reason = canonicalIngredientId == null
                    ? UnresolvedReason.NORMALIZED_EXACT_NAME_NOT_FOUND
                    : UnresolvedReason.CANONICAL_ID_AND_NORMALIZED_EXACT_NAME_NOT_FOUND;
            return new Unresolved(reason.name(), VERSION);
        }
        if (candidates.size() > 1) {
            List<Long> candidateIds = candidates.stream()
                    .map(ExactNameCandidate::canonicalIngredientId)
                    .toList();
            return new Ambiguous(
                    candidateIds,
                    AmbiguityReason.MULTIPLE_NORMALIZED_EXACT_NAME_MATCHES.name(),
                    VERSION);
        }

        ExactNameCandidate candidate = candidates.getFirst();
        return new Resolved(candidate.canonicalIngredientId(), candidate.matchRule().name(), VERSION);
    }

    public List<IngredientVocabularyIssue> diagnostics() {
        return diagnostics;
    }

    static String normalize(String value) {
        if (value == null) {
            return "";
        }

        String composed = Normalizer.normalize(value, Normalizer.Form.NFC);
        StringBuilder withoutSpaces = new StringBuilder(composed.length());
        composed.codePoints()
                .filter(codePoint -> !Character.isWhitespace(codePoint) && !Character.isSpaceChar(codePoint))
                .forEach(withoutSpaces::appendCodePoint);

        return Normalizer.normalize(withoutSpaces.toString().toLowerCase(Locale.ROOT), Normalizer.Form.NFC);
    }

    private static void index(
            Map<String, Map<Long, EnumSet<MatchRule>>> index,
            String rawName,
            long canonicalIngredientId,
            MatchRule matchRule) {
        String normalizedName = normalize(rawName);
        if (normalizedName.isEmpty()) {
            return;
        }

        index.computeIfAbsent(normalizedName, ignored -> new TreeMap<>())
                .computeIfAbsent(canonicalIngredientId, ignored -> EnumSet.noneOf(MatchRule.class))
                .add(matchRule);
    }

    private static Map<String, List<ExactNameCandidate>> immutableIndex(
            Map<String, Map<Long, EnumSet<MatchRule>>> mutableIndex) {
        Map<String, List<ExactNameCandidate>> ordered = new TreeMap<>();
        mutableIndex.forEach((name, candidatesById) -> {
            List<ExactNameCandidate> candidates = new ArrayList<>(candidatesById.size());
            candidatesById
                    .forEach((id, matchRules) -> candidates.add(new ExactNameCandidate(id, bestRule(matchRules))));
            candidates.sort(Comparator.comparingLong(ExactNameCandidate::canonicalIngredientId));
            ordered.put(name, List.copyOf(candidates));
        });
        return java.util.Collections.unmodifiableMap(new LinkedHashMap<>(ordered));
    }

    private static MatchRule bestRule(EnumSet<MatchRule> matchRules) {
        return matchRules.stream()
                .min(Comparator.comparingInt(MatchRule::reportingPriority))
                .orElseThrow();
    }

    public enum MatchRule {
        CANONICAL_ID_DIRECT(0),
        KOREAN_NAME_EXACT(1),
        ENGLISH_NAME_EXACT(2),
        ALIAS_EXACT(3);

        private final int reportingPriority;

        MatchRule(int reportingPriority) {
            this.reportingPriority = reportingPriority;
        }

        private int reportingPriority() {
            return reportingPriority;
        }
    }

    public enum UnresolvedReason {
        MISSING_IDENTITY_INPUT,
        CANONICAL_ID_NOT_FOUND,
        NORMALIZED_EXACT_NAME_NOT_FOUND,
        CANONICAL_ID_AND_NORMALIZED_EXACT_NAME_NOT_FOUND
    }

    public enum AmbiguityReason {
        MULTIPLE_NORMALIZED_EXACT_NAME_MATCHES
    }

    private record ExactNameCandidate(long canonicalIngredientId, MatchRule matchRule) {
    }
}
