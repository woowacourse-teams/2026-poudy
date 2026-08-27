package com.poudy.search.domain;

public final class LatinReading {

    public static final int MAX_ACRONYM_LENGTH = 4;

    private static final String[] LETTER_READINGS = {
            "에이",
            "비",
            "씨",
            "디",
            "이",
            "에프",
            "지",
            "에이치",
            "아이",
            "제이",
            "케이",
            "엘",
            "엠",
            "엔",
            "오",
            "피",
            "큐",
            "알",
            "에스",
            "티",
            "유",
            "브이",
            "더블유",
            "엑스",
            "와이",
            "제트"};
    private static final char FIRST_LETTER = 'a';
    private static final char LAST_LETTER = 'z';
    private static final char FIRST_SYLLABLE = '가';
    private static final char LAST_SYLLABLE = '힣';

    private LatinReading() {
    }

    public static String ofKeyword(String normalized) {
        return read(normalized);
    }

    public static String ofName(String normalized) {
        if (!hasSyllable(normalized)) {
            return normalized;
        }

        return read(normalized);
    }

    static IndexedText ofName(IndexedText normalized) {
        if (!hasSyllable(normalized.value())) {
            return normalized;
        }

        IndexedText.Builder read = IndexedText.builder();
        int index = 0;
        while (index < normalized.value().length()) {
            int end = endOfRun(normalized.value(), index);
            if (end == index) {
                read.append(
                    normalized.value().charAt(index),
                    normalized.sourceStartAt(index),
                    normalized.sourceEndAt(index)
                );
                index++;
                continue;
            }
            appendRun(read, normalized, index, end);
            index = end;
        }
        return read.build();
    }

    private static String read(String normalized) {
        if (!hasLetter(normalized)) {
            return normalized;
        }

        StringBuilder read = new StringBuilder(normalized.length());
        int index = 0;
        while (index < normalized.length()) {
            int end = endOfRun(normalized, index);
            if (end == index) {
                read.append(normalized.charAt(index));
                index++;
                continue;
            }
            appendRun(read, normalized, index, end);
            index = end;
        }

        return read.toString();
    }

    private static void appendRun(StringBuilder read, String normalized, int start, int end) {
        if (end - start > MAX_ACRONYM_LENGTH) {
            read.append(normalized, start, end);
            return;
        }
        for (int index = start; index < end; index++) {
            read.append(LETTER_READINGS[normalized.charAt(index) - FIRST_LETTER]);
        }
    }

    private static void appendRun(IndexedText.Builder read, IndexedText normalized, int start, int end) {
        if (end - start > MAX_ACRONYM_LENGTH) {
            read.append(normalized, start, end);
            return;
        }
        for (int index = start; index < end; index++) {
            read.append(
                LETTER_READINGS[normalized.value().charAt(index) - FIRST_LETTER],
                normalized.sourceStartAt(index),
                normalized.sourceEndAt(index)
            );
        }
    }

    private static int endOfRun(String normalized, int start) {
        int end = start;
        while (end < normalized.length() && isLetter(normalized.charAt(end))) {
            end++;
        }
        return end;
    }

    private static boolean hasLetter(String normalized) {
        return normalized.chars().anyMatch(character -> isLetter((char) character));
    }

    private static boolean hasSyllable(String normalized) {
        return normalized.chars().anyMatch(character -> isSyllable((char) character));
    }

    private static boolean isLetter(char character) {
        return character >= FIRST_LETTER && character <= LAST_LETTER;
    }

    private static boolean isSyllable(char character) {
        return character >= FIRST_SYLLABLE && character <= LAST_SYLLABLE;
    }
}
