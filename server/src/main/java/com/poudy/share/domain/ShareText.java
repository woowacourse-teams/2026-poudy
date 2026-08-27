package com.poudy.share.domain;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public record ShareText(String value) {

    private static final Pattern LINK = Pattern.compile("https?://\\S+", Pattern.CASE_INSENSITIVE);
    private static final Pattern SERVICE_PHRASE = Pattern.compile("올리브영에서.*", Pattern.DOTALL);
    private static final Pattern PROMOTION_TAG = Pattern.compile("\\[[^\\]]*\\]");
    private static final Pattern PLAN_NOTE = Pattern.compile("\\([^)]*\\)");
    private static final Pattern VOLUME = Pattern.compile(
        "\\d+(\\.\\d+)?\\s*(ml|g|ea|매|정|개|입|팩)([Xx*]\\s*\\d+)?(?![A-Za-z])",
        Pattern.CASE_INSENSITIVE
    );
    private static final Set<String> PLAN_WORDS = Set.of(
        "기획",
        "기획세트",
        "세트",
        "리필",
        "증정",
        "단독",
        "더블",
        "튜브",
        "한정",
        "대용량",
        "본품",
        "구성",
        "패키지"
    );
    private static final String SPACE = " ";

    public ShareText {
        value = Objects.requireNonNullElse(value, "").trim();
    }

    public boolean hasLink() {
        return LINK.matcher(value).find();
    }

    public String productPhrase() {
        return productPhrases().getLast();
    }

    public List<String> productPhrases() {
        String phrase = SERVICE_PHRASE.matcher(value).replaceAll(SPACE);
        phrase = LINK.matcher(phrase).replaceAll(SPACE);
        phrase = PROMOTION_TAG.matcher(phrase).replaceAll(SPACE);
        phrase = PLAN_NOTE.matcher(phrase).replaceAll(SPACE);

        String truncated = ShareWords.join(ShareWords.of(truncatedAtVolume(phrase)));
        String trimmed = withoutTrailingPlanWords(truncated);

        if (truncated.equals(trimmed)) {
            return List.of(trimmed);
        }

        return List.of(truncated, trimmed);
    }

    private static String truncatedAtVolume(String phrase) {
        Matcher volume = VOLUME.matcher(phrase);

        if (volume.find()) {
            return phrase.substring(0, volume.start());
        }

        return phrase;
    }

    private static boolean isPlanWord(String word) {
        return PLAN_WORDS.contains(word) || word.endsWith("기획");
    }

    private static String withoutTrailingPlanWords(String phrase) {
        List<String> words = ShareWords.of(phrase);
        int end = words.size();

        while (end > 0 && isPlanWord(words.get(end - 1))) {
            end--;
        }

        return ShareWords.join(words.subList(0, end));
    }
}
