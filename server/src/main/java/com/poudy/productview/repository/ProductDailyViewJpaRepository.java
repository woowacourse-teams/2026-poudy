package com.poudy.productview.repository;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface ProductDailyViewJpaRepository extends Repository<ProductDailyViewEntity, ProductDailyViewId> {

    @Transactional
    @Modifying
    @Query(value = "insert into product_daily_view (view_date, product_id, view_count) values (:viewDate, :productId, 1)"
        + " on conflict (view_date, product_id) do update set view_count = product_daily_view.view_count + 1", nativeQuery = true)
    void increase(@Param("viewDate") LocalDate viewDate, @Param("productId") Long productId);

    @Query("select new com.poudy.productview.repository.ProductViewCount(view.id.productId, sum(view.viewCount))"
        + " from ProductDailyViewEntity view group by view.id.productId")
    List<ProductViewCount> sumAll();

    @Query("select new com.poudy.productview.repository.ProductViewCount(view.id.productId, sum(view.viewCount))"
        + " from ProductDailyViewEntity view where view.id.viewDate between :firstDate and :lastDate"
        + " group by view.id.productId")
    List<ProductViewCount> sumBetween(@Param("firstDate") LocalDate firstDate, @Param("lastDate") LocalDate lastDate);
}
