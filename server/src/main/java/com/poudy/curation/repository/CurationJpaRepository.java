package com.poudy.curation.repository;

import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

public interface CurationJpaRepository extends Repository<CurationEntity, Long> {

    @Query("select curation from CurationEntity curation where (:id is null or curation.id = :id) order by curation.position")
    List<CurationEntity> findCurations(Long id);

    @Query("select block from CurationBlockEntity block where (:id is null or block.curationId = :id) order by block.curationId, block.position")
    List<CurationBlockEntity> findBlocks(Long id);

    @Query("select filter from CurationBlockFilterEntity filter where (:id is null or filter.id.blockId in (select b.id from CurationBlockEntity b where b.curationId = :id)) order by filter.id.blockId, filter.position")
    List<CurationBlockFilterEntity> findFilters(Long id);

    @Query("select product from CurationBlockProductEntity product where (:id is null or product.id.blockId in (select b.id from CurationBlockEntity b where b.curationId = :id)) order by product.id.blockId, product.position")
    List<CurationBlockProductEntity> findProducts(Long id);

    @Query("select productFilter from CurationBlockProductFilterEntity productFilter"
        + " where (:id is null or productFilter.id.blockId in (select b.id from CurationBlockEntity b where b.curationId = :id)) order by productFilter.id.blockId, productFilter.id.productId, productFilter.position")
    List<CurationBlockProductFilterEntity> findProductFilters(Long id);
}
