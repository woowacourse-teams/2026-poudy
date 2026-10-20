package com.poudy.shelf.domain;

import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.SortedMap;
import java.util.TreeMap;
import java.util.stream.Collectors;

// 한 회원이 한 제품에 남긴 기록 가운데 최신 표시가 켜진 것. 새 기록은 늘 최신이라 가장 나중 기록도 여기에 있다.
public final class ShelfRatingHistory {

    private final SortedMap<Long, ShelfRatingRecord> currentRecords;

    private ShelfRatingHistory(SortedMap<Long, ShelfRatingRecord> currentRecords) {
        this.currentRecords = currentRecords;
    }

    public static ShelfRatingHistory of(Map<Long, ShelfRatingRecord> currentRecords) {
        SortedMap<Long, ShelfRatingRecord> orderedRecords = new TreeMap<>(currentRecords);
        return new ShelfRatingHistory(Collections.unmodifiableSortedMap(orderedRecords));
    }

    // 사용 상태·평가 값·프로필이 마지막 기록과 모두 같으면 남길 것이 없다.
    public boolean needsRecord(ShelfRatingRecord next) {
        return currentRecords.isEmpty() || !lastRecord().hasSameValuesAs(next);
    }

    // 새 기록이 대신하는 기록. 같은 프로필의 최신 기록과, 30일이 지나기 전에 프로필을 바꿔 다시 평가했을 때의
    // 마지막 기록이다. 나머지는 다른 프로필의 평가로 남는다.
    public Set<Long> supersededBy(ShelfRatingRecord next) {
        return currentRecords.entrySet().stream()
            .filter(entry -> entry.getValue().hasSameProfileAs(next) || isCorrectedBy(entry.getKey(), next))
            .map(Map.Entry::getKey)
            .collect(Collectors.toUnmodifiableSet());
    }

    private boolean isCorrectedBy(Long id, ShelfRatingRecord next) {
        return id.equals(currentRecords.lastKey()) && lastRecord().isWithinCorrectionPeriod(next);
    }

    private ShelfRatingRecord lastRecord() {
        return currentRecords.get(currentRecords.lastKey());
    }
}
