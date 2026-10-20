package com.poudy.shelf.domain;

import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.SortedMap;
import java.util.TreeMap;
import java.util.stream.Collectors;

// 한 회원이 한 제품에 남긴 기록 가운데 최신 표시가 켜진 것. 새 기록은 늘 최신이라 가장 나중 기록도 여기에 있다.
public final class ShelfRatingHistory {

    // 프로필을 바꾸고 이 기간 안에 다시 평가하면 새 평가가 아니라 마지막 평가를 고친 것으로 본다.
    private static final long CORRECTION_DAYS = 30;

    private final SortedMap<Long, ShelfRatingRecord> currentRecordsById;

    public ShelfRatingHistory(Map<Long, ShelfRatingRecord> currentRecordsById) {
        this.currentRecordsById = Collections.unmodifiableSortedMap(new TreeMap<>(currentRecordsById));
    }

    // 사용 상태·평가 값·프로필이 마지막 기록과 모두 같으면 남길 것이 없다.
    public boolean needsRecord(ShelfRatingRecord next) {
        return currentRecordsById.isEmpty() || !lastRecord().hasSameValuesAs(next);
    }

    // 새 기록이 대신하는 기록. 같은 프로필의 최신 기록과, 30일이 지나기 전에 프로필을 바꿔 다시 평가했을 때의
    // 마지막 기록이다. 나머지는 다른 프로필의 평가로 남는다.
    public Set<Long> supersededBy(ShelfRatingRecord next) {
        return currentRecordsById.entrySet().stream()
            .filter(entry -> entry.getValue().hasSameProfileAs(next) || isCorrectedBy(entry.getKey(), next))
            .map(Map.Entry::getKey)
            .collect(Collectors.toUnmodifiableSet());
    }

    private boolean isCorrectedBy(Long id, ShelfRatingRecord next) {
        return id.equals(currentRecordsById.lastKey()) && lastRecord().daysUntil(next) < CORRECTION_DAYS;
    }

    private ShelfRatingRecord lastRecord() {
        return currentRecordsById.get(currentRecordsById.lastKey());
    }
}
