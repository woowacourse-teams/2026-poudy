package com.poudy.category.repository;

import java.util.List;
import org.springframework.data.repository.Repository;

public interface CategoryJpaRepository extends Repository<CategoryEntity, Long> {

    List<CategoryEntity> findAllByOrderByDisplayOrderAsc();
}
