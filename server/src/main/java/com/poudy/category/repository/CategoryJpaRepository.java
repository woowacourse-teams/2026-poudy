package com.poudy.category.repository;

import com.poudy.category.domain.Category;
import java.util.List;
import org.springframework.data.repository.Repository;

public interface CategoryJpaRepository extends Repository<Category, Long> {

    List<Category> findAllByOrderByIdAsc();
}
