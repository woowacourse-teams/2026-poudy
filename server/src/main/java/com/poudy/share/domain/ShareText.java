package com.poudy.share.domain;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public record ShareText(String value) {

    private static final Pattern LINK = Pattern.compile("https?://\\S+", Pattern.CASE_INSENSITIVE);
    // 제품명에 "올리브영"은 오지 않아 이 뒤는 통째로 버린다.
    private static final Pattern SERVICE_PHRASE = Pattern.compile("올리브영에서.*", Pattern.DOTALL);
    private static final Pattern PROMOTION_TAG = Pattern.compile("\\[[^\\]]*\\]");
    private static final Pattern PLAN_NOTE = Pattern.compile("\\([^)]*\\)");
    // 카탈로그 제품명에는 용량 표기가 한 건도 없다. 용량 뒤는 전부 기획 문구다.
    private static final Pattern VOLUME = Pattern.compile(
            "\\d+(\\.\\d+)?\\s*(ml|g|ea|매|정|개|입|팩)([Xx*]\\s*\\d+)?(?![A-Za-z])",
            Pattern.CASE_INSENSITIVE);
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
            "패키지");
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

    // "어성초 크림 카밍 튜브"처럼 제품명이 기획 낱말로 끝날 수 있어, 털어 내기 전 구절도 후보로 남긴다.
    public List<String> productPhrases() {
        String phrase = SERVICE_PHRASE.matcher(value).replaceAll(SPACE);
        phrase = LINK.matcher(phrase).replaceAll(SPACE);
        phrase = PROMOTION_TAG.matcher(phrase).replaceAll(SPACE);
        // 괄호 안 기획 구성에도 용량이 있어 절단보다 먼저 지운다.
        phrase = PLAN_NOTE.matcher(phrase).replaceAll(SPACE);

        String truncated = ShareWords.join(ShareWords.of(truncatedAtVolume(phrase)));
        String trimmed = withoutTrailingPlanWords(truncated);

        return truncated.equals(trimmed) ? List.of(trimmed) : List.of(truncated, trimmed);
    }

    private static String truncatedAtVolume(String phrase) {
        Matcher volume = VOLUME.matcher(phrase);

        return volume.find() ? phrase.substring(0, volume.start()) : phrase;
    }

    // "더블기획" 처럼 한 낱말로 붙어 오는 형태가 있다. 카탈로그 제품명에는 "기획" 이 한 건도 없다.
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
