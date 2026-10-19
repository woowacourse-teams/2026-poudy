package com.poudy.product.search.domain.analysis.reading;

import com.poudy.product.search.domain.text.IndexedSearchText;

public final class LatinReading {
    private static final String[] READINGS = {
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

    public IndexedSearchText name(IndexedSearchText source) {
        if (!source.hasHangul()) {
            return source;
        }
        return expand(source);
    }

    public IndexedSearchText query(IndexedSearchText source) {
        if (source.text().matches("[a-z]")) {
            return source;
        }
        return expand(source);
    }

    private IndexedSearchText expand(IndexedSearchText source) {
        IndexedSearchText.Builder result = IndexedSearchText.builder();
        int i = 0;
        while (i < source.length()) {
            int end = i;
            while (end < source.length() && source.charAt(end) >= 'a' && source.charAt(end) <= 'z') {
                end++;
            }
            if (end == i) {
                result.append(source, i);
                i++;
                continue;
            }
            for (int j = i; j < end; j++) {
                if (end - i <= 4) {
                    result.append(READINGS[source.charAt(j) - 'a'], source.startAt(j), source.endAt(j));
                } else {
                    result.append(source, j);
                }
            }
            i = end;
        }
        return result.build();
    }
}
