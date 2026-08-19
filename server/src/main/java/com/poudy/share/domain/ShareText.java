package com.poudy.share.domain;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 올리브영에서 공유한 텍스트 원문. 제품을 찾는 데 쓰는 제품명 구절만 남기는 일을 담당한다.
 */
public record ShareText(String value) {

    private static final Pattern LINK = Pattern.compile("https?://\\S+", Pattern.CASE_INSENSITIVE);
    // 꼬릿말 뒤로는 안내 문구와 링크뿐이라 통째로 버린다. 제품명에 "올리브영"은 오지 않는다.
    private static final Pattern SERVICE_PHRASE = Pattern.compile("올리브영에서.*", Pattern.DOTALL);
    private static final Pattern PROMOTION_TAG = Pattern.compile("\\[[^\\]]*\\]");
    private static final Pattern PLAN_NOTE = Pattern.compile("\\([^)]*\\)");
    // 카탈로그 제품명에는 용량 표기가 한 건도 없다. 용량이 나오면 그 뒤는 전부 기획 문구다.
    private static final Pattern VOLUME = Pattern.compile(
            "\\d+(\\.\\d+)?\\s*(ml|g|ea|매|정|개|입|팩)(?![가-힣A-Za-z])",
            Pattern.CASE_INSENSITIVE);
    // 용량 없이 기획 문구만 붙는 공유가 있어 꼬리에 남은 기획 낱말을 따로 턴다.
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
            "본품",
            "구성",
            "패키지");
    private static final String SPACE = " ";

    public ShareText {
        value = Objects.requireNonNullElse(value, "").trim();
    }

    /**
     * 공유 링크가 들어 있는지 확인한다. 링크가 없으면 올리브영 공유로 보지 않는다.
     */
    public boolean hasLink() {
        return LINK.matcher(value).find();
    }

    /**
     * 제품명만 남기고 공유 텍스트의 나머지를 걷어낸다. 브랜드는 아직 붙어 있다.
     */
    public String productPhrase() {
        return productPhrases().getLast();
    }

    /**
     * 제품을 찾아 볼 제품명 구절을 넓은 것부터 준다.
     *
     * <p>기획 낱말은 카탈로그의 제품명에도 쓰인다. "어성초 크림 카밍 튜브"처럼 제품명이 기획 낱말로 끝나면 꼬리를 털어 낸 구절은
     * 제품명과 정확히 같아지지 않아 이름이 정확히 같은 제품을 놓친다. 털어 내기 전 구절을 먼저 맞춰 보고, 맞지 않을 때만 털어 낸 구절을 쓴다.
     */
    public List<String> productPhrases() {
        String phrase = SERVICE_PHRASE.matcher(value).replaceAll(SPACE);
        phrase = LINK.matcher(phrase).replaceAll(SPACE);
        phrase = PROMOTION_TAG.matcher(phrase).replaceAll(SPACE);
        // 괄호 안의 기획 구성에도 용량이 들어 있어 용량 절단보다 먼저 지운다.
        phrase = PLAN_NOTE.matcher(phrase).replaceAll(SPACE);

        String truncated = ShareWords.join(ShareWords.of(truncatedAtVolume(phrase)));
        String trimmed = withoutTrailingPlanWords(truncated);

        return truncated.equals(trimmed) ? List.of(trimmed) : List.of(truncated, trimmed);
    }

    private static String truncatedAtVolume(String phrase) {
        Matcher volume = VOLUME.matcher(phrase);

        return volume.find() ? phrase.substring(0, volume.start()) : phrase;
    }

    private static String withoutTrailingPlanWords(String phrase) {
        List<String> words = ShareWords.of(phrase);
        int end = words.size();

        while (end > 0 && PLAN_WORDS.contains(words.get(end - 1))) {
            end--;
        }

        return ShareWords.join(words.subList(0, end));
    }
}
