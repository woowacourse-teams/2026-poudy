package com.poudy.product.search.domain.analysis.hangul;

import com.poudy.product.search.domain.text.IndexedSearchText;
import java.util.Map;

public final class JamoEncoder {
    static final String INITIALS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
    static final String FINALS = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";
    static final Map<Integer, int[]> VOWELS = Map.of(
        9,
        new int[] {8, 0},
        10,
        new int[] {8, 1},
        11,
        new int[] {8, 20},
        14,
        new int[] {13, 4},
        15,
        new int[] {13, 5},
        16,
        new int[] {13, 20},
        19,
        new int[] {18, 20}
    );
    static final Map<Integer, int[]> CLUSTERS = Map.ofEntries(
        Map.entry(3, new int[] {1, 19}),
        Map.entry(5, new int[] {4, 22}),
        Map.entry(6, new int[] {4, 27}),
        Map.entry(9, new int[] {8, 1}),
        Map.entry(10, new int[] {8, 16}),
        Map.entry(11, new int[] {8, 17}),
        Map.entry(12, new int[] {8, 19}),
        Map.entry(13, new int[] {8, 25}),
        Map.entry(14, new int[] {8, 26}),
        Map.entry(15, new int[] {8, 27}),
        Map.entry(18, new int[] {17, 19})
    );

    public IndexedSearchText encode(IndexedSearchText source) {
        IndexedSearchText.Builder result = IndexedSearchText.builder();
        for (int i = 0; i < source.length(); i++) {
            char letter = source.charAt(i);
            int start = source.startAt(i);
            int end = source.endAt(i);
            if (letter < '가' || letter > '힣') {
                result.append(source, i);
                continue;
            }
            int syllable = letter - '가';
            result.append((char) (0x1100 + syllable / 588), start, end);
            for (int vowel : VOWELS.getOrDefault(syllable % 588 / 28, new int[] {syllable % 588 / 28})) {
                result.append((char) (0x1161 + vowel), start, end);
            }
            int last = syllable % 28;
            if (last > 0) {
                for (int consonant : CLUSTERS.getOrDefault(last, new int[] {last})) {
                    result.append((char) (0x11A7 + consonant), start, end);
                }
            }
            result.append('\u3164', start, end);
        }
        return result.build();
    }

    public IndexedSearchText initials(IndexedSearchText source) {
        IndexedSearchText.Builder result = IndexedSearchText.builder();
        for (int i = 0; i < source.length(); i++) {
            char letter = source.charAt(i);
            if (letter >= '가' && letter <= '힣') {
                letter = INITIALS.charAt((letter - '가') / 588);
            }
            result.append(letter, source.startAt(i), source.endAt(i));
        }
        return result.build();
    }

}
