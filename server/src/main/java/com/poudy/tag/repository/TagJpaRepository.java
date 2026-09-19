package com.poudy.tag.repository;

import java.util.List;
import org.springframework.data.repository.Repository;

public interface TagJpaRepository extends Repository<TagEntity, Long> {

    List<TagEntity> findAllByOrderByIdAsc();
}
