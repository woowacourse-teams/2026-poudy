package com.poudy.routine.domain;

import com.poudy.exception.ErrorCode;
import java.util.List;
import java.util.stream.Stream;

public final class RoutineProducts {

    private final List<Long> morning;
    private final List<Long> evening;

    public RoutineProducts(List<Long> morning, List<Long> evening) {
        List<Long> morningProductIds = List.copyOf(morning);
        List<Long> eveningProductIds = List.copyOf(evening);
        if (hasDuplicate(morningProductIds) || hasDuplicate(eveningProductIds)) {
            throw new InvalidRoutineException(ErrorCode.DUPLICATE_ROUTINE_PRODUCT);
        }
        this.morning = morningProductIds;
        this.evening = eveningProductIds;
    }

    private static boolean hasDuplicate(List<Long> productIds) {
        return productIds.stream().distinct().count() != productIds.size();
    }

    public List<Long> at(TimeOfDay timeOfDay) {
        if (timeOfDay == TimeOfDay.MORNING) {
            return morning;
        }
        return evening;
    }

    public List<Long> productIds() {
        return Stream.concat(morning.stream(), evening.stream()).distinct().toList();
    }
}
