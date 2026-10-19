package com.poudy.product.search.domain.analysis.hangul;

import com.poudy.product.search.domain.text.IndexedSearchText;
import java.util.ArrayList;
import java.util.List;

/** 조합 중인 한 음절의 상태. 받침 이동 시 각 자모가 온 원문 범위를 보존한다. */
final class HangulSyllable {
    private int initial = -1;
    private int start;
    private int end;
    private int vowel = -1;
    private final List<Integer> finals = new ArrayList<>();
    private final List<Integer> finalStarts = new ArrayList<>();
    private final List<Integer> finalEnds = new ArrayList<>();

    void beginInitial(char letter, int sourceStart, int sourceEnd) {
        initial = JamoEncoder.INITIALS.indexOf(letter);
        start = sourceStart;
        end = sourceEnd;
    }

    void begin(char syllable, int sourceStart, int sourceEnd) {
        int code = syllable - '가';
        initial = code / 588;
        vowel = code % 588 / 28;
        start = sourceStart;
        end = sourceEnd;
        int last = code % 28;
        if (last > 0) {
            for (int part : JamoEncoder.CLUSTERS.getOrDefault(last, new int[] {last})) {
                addFinal(part, sourceStart, sourceEnd);
            }
        }
    }

    boolean absorbVowel(int incoming, int sourceStart, int sourceEnd, IndexedSearchText.Builder output) {
        if (initial < 0) {
            return false;
        }
        if (vowel < 0) {
            vowel = incoming;
            end = sourceEnd;
            return true;
        }
        if (!finals.isEmpty()) {
            int last = finals.removeLast();
            int movedStart = finalStarts.removeLast();
            int movedEnd = finalEnds.removeLast();
            flush(output);
            beginInitial(JamoEncoder.FINALS.charAt(last), movedStart, movedEnd);
            vowel = incoming;
            end = sourceEnd;
            return true;
        }
        for (var combination : JamoEncoder.VOWELS.entrySet()) {
            int[] pair = combination.getValue();
            if (pair[0] == vowel && pair[1] == incoming) {
                vowel = combination.getKey();
                end = sourceEnd;
                return true;
            }
        }
        return false;
    }

    boolean absorbFinal(char letter, int sourceStart, int sourceEnd) {
        int incoming = JamoEncoder.FINALS.indexOf(letter);
        if (initial < 0 || vowel < 0 || incoming <= 0) {
            return false;
        }
        int[] parts = JamoEncoder.CLUSTERS.getOrDefault(incoming, new int[] {incoming});
        if (finals.isEmpty()) {
            for (int part : parts) {
                addFinal(part, sourceStart, sourceEnd);
            }
            return true;
        }
        if (finals.size() == 1 && parts.length == 1) {
            for (int[] pair : JamoEncoder.CLUSTERS.values()) {
                if (pair[0] == finals.getFirst() && pair[1] == incoming) {
                    addFinal(incoming, sourceStart, sourceEnd);
                    return true;
                }
            }
        }
        return false;
    }

    private void addFinal(int value, int sourceStart, int sourceEnd) {
        finals.add(value);
        finalStarts.add(sourceStart);
        finalEnds.add(sourceEnd);
    }

    void flush(IndexedSearchText.Builder output) {
        if (initial < 0) {
            return;
        }
        int sourceEnd = end;
        if (!finalEnds.isEmpty()) {
            sourceEnd = Math.max(sourceEnd, finalEnds.getLast());
        }
        char letter = JamoEncoder.INITIALS.charAt(initial);
        if (vowel >= 0) {
            int last = 0;
            if (finals.size() == 1) {
                last = finals.getFirst();
            }
            if (finals.size() == 2) {
                for (var entry : JamoEncoder.CLUSTERS.entrySet()) {
                    int[] pair = entry.getValue();
                    if (pair[0] == finals.getFirst() && pair[1] == finals.getLast()) {
                        last = entry.getKey();
                    }
                }
            }
            letter = (char) ('가' + (initial * 21 + vowel) * 28 + last);
        }
        output.append(letter, start, sourceEnd);
        initial = -1;
        vowel = -1;
        finals.clear();
        finalStarts.clear();
        finalEnds.clear();
    }
}
