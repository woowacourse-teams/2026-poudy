package com.poudy.productview.repository;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.time.LocalDate;

@Embeddable
public record ProductDailyViewId(
    @Column(name = "view_date") LocalDate viewDate,
    @Column(name = "product_id") Long productId) implements Serializable {
}
