package com.poudy.common.domain;

public record Chosung(String value) {

    private static final String LETTERS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
    private static final String DOUBLE_LETTERS = "ㄲㄸㅃㅆㅉ";
    private static final String FOLDED_LETTERS = "ㄱㄷㅂㅅㅈ";
    private static final char BREAK = ' ';
    private static final char FIRST_INITIAL_JAMO = 'ᄀ';
    private static final char LAST_INITIAL_JAMO = 'ᄒ';
    private static final char FIRST_SYLLABLE = '가';
    private static final char LAST_SYLLABLE = '힣';
    private static final int LETTERS_PER_CHOSUNG = 588;

    public static Chosung of(String text) {
        StringBuilder extracted = new StringBuilder();

        for (int index = 0; index < text.length(); index++) {
            char character = text.charAt(index);
            extracted.append(isSyllable(character) ? letterOf(character) : BREAK);
        }

        return new Chosung(extracted.toString());
    }

    public static String toCompatibilityLetters(String text) {
        StringBuilder unified = new StringBuilder(text);

        for (int index = 0; index < unified.length(); index++) {
            char character = unified.charAt(index);
            if (isInitialJamo(character)) {
                unified.setCharAt(index, LETTERS.charAt(character - FIRST_INITIAL_JAMO));
            }
        }

        return unified.toString();
    }

    public static boolean isWrittenIn(String text) {
        if (text.isEmpty()) {
            return false;
        }

        return text.chars().allMatch(character -> LETTERS.indexOf(character) >= 0);
    }

    public static boolean isDouble(String letter) {
        return DOUBLE_LETTERS.contains(letter);
    }

    public boolean contains(String letters) {
        return value.contains(letters);
    }

    public Chosung folded() {
        StringBuilder folded = new StringBuilder(value);

        for (int index = 0; index < folded.length(); index++) {
            int position = DOUBLE_LETTERS.indexOf(folded.charAt(index));
            if (position >= 0) {
                folded.setCharAt(index, FOLDED_LETTERS.charAt(position));
            }
        }

        return new Chosung(folded.toString());
    }

    private static boolean isInitialJamo(char character) {
        return character >= FIRST_INITIAL_JAMO && character <= LAST_INITIAL_JAMO;
    }

    private static boolean isSyllable(char character) {
        return character >= FIRST_SYLLABLE && character <= LAST_SYLLABLE;
    }

    private static char letterOf(char syllable) {
        return LETTERS.charAt((syllable - FIRST_SYLLABLE) / LETTERS_PER_CHOSUNG);
    }
}
