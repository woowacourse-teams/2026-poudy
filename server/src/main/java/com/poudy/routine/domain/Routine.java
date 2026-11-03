package com.poudy.routine.domain;

import com.poudy.product.domain.Products;
import java.util.List;

public final class Routine {

    private final long id;
    private final RoutineName name;
    private final RoutineMemo memo;
    private final boolean isPublic;
    private final RoutineProducts products;

    public Routine(long id, RoutineName name, RoutineMemo memo, boolean isPublic, RoutineProducts products) {
        this.id = id;
        this.name = name;
        this.memo = memo;
        this.isPublic = isPublic;
        this.products = products;
    }

    public List<Long> productIds() {
        return products.productIds();
    }

    public RoutineView resolve(Products catalog) {
        return new RoutineView(
            id,
            name.value(),
            memo.value(),
            isPublic,
            catalog.findAllById(products.at(TimeOfDay.MORNING)),
            catalog.findAllById(products.at(TimeOfDay.EVENING))
        );
    }
}
