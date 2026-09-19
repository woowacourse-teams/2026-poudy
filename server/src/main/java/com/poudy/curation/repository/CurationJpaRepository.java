package com.poudy.curation.repository;

import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

public interface CurationJpaRepository extends Repository<CurationEntity, Long> {

    @Query("select curation from CurationEntity curation order by curation.position")
    List<CurationEntity> findAllCurations();

    @Query("select block from CurationBlockEntity block order by block.curationId, block.position")
    List<CurationBlockEntity> findAllBlocks();

    @Query("select filter from CurationBlockFilterEntity filter order by filter.id.blockId, filter.position")
    List<CurationBlockFilterEntity> findAllFilters();

    @Query("select product from CurationBlockProductEntity product order by product.id.blockId, product.position")
    List<CurationBlockProductEntity> findAllProducts();

    @Query("select productFilter from CurationBlockProductFilterEntity productFilter"
        + " order by productFilter.id.blockId, productFilter.id.productId, productFilter.position")
    List<CurationBlockProductFilterEntity> findAllProductFilters();
}
