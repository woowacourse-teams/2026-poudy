package com.poudy.product.search.domain.analysis.hangul;

import com.poudy.product.search.domain.text.IndexedSearchText;

public final class HangulComposer {
    public IndexedSearchText compose(String raw) {
        IndexedSearchText.Builder normalized = IndexedSearchText.builder();
        for (int i = 0; i < raw.length();) {
            int code = raw.codePointAt(i);
            int end = i + Character.charCount(code);
            int converted = compatibility(code);
            if (visible(converted)) {
                normalized.append((char) converted, i, end);
            }
            i = end;
        }
        IndexedSearchText input = normalized.build();
        IndexedSearchText.Builder output = IndexedSearchText.builder();
        HangulSyllable syllable = new HangulSyllable();
        for (int i = 0; i < input.length(); i++) {
            char letter = input.charAt(i);
            int start = input.startAt(i);
            int end = input.endAt(i);
            if (letter >= 'ㅏ' && letter <= 'ㅣ') {
                if (syllable.absorbVowel(letter - 'ㅏ', start, end, output)) {
                    continue;
                }
            } else if (letter >= 'ㄱ' && letter <= 'ㅎ' && syllable.absorbFinal(letter, start, end)) {
                continue;
            }
            syllable.flush(output);
            if (letter >= '가' && letter <= '힣') {
                syllable.begin(letter, start, end);
            } else if (JamoEncoder.INITIALS.indexOf(letter) >= 0) {
                syllable.beginInitial(letter, start, end);
            } else {
                output.append(letter, start, end);
            }
        }
        syllable.flush(output);
        return output.build();
    }

    private static int compatibility(int code) {
        if (code >= 'A' && code <= 'Z') {
            return code + 32;
        }
        if (code >= 0xFF21 && code <= 0xFF3A) {
            return code - 65216;
        }
        if ((code >= 0xFF41 && code <= 0xFF5A) || (code >= 0xFF10 && code <= 0xFF19)) {
            return code - 65248;
        }
        if (code >= 0x1100 && code <= 0x1112) {
            return JamoEncoder.INITIALS.charAt(code - 0x1100);
        }
        if (code >= 0x1161 && code <= 0x1175) {
            return code + 8174;
        }
        if (code >= 0x11A8 && code <= 0x11C2) {
            return JamoEncoder.FINALS.charAt(code - 0x11A7);
        }
        return code;
    }

    private static boolean visible(int code) {
        return (code >= '0' && code <= '9') || (code >= 'a' && code <= 'z')
            || (code >= '가' && code <= '힣') || (code >= 'ㄱ' && code <= 'ㅣ');
    }
}
