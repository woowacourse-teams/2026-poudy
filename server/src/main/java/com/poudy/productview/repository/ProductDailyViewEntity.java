package com.poudy.productview.repository;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "product_daily_view")
public class ProductDailyViewEntity {

    @EmbeddedId
    private ProductDailyViewId id;

    @Column(name = "view_count")
    private Long viewCount;

    protected ProductDailyViewEntity() {
    }
}
