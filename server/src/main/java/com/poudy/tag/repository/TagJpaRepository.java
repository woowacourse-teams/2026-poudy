package com.poudy.tag.repository;

import com.poudy.tag.domain.Tag;
import java.util.List;
import org.springframework.data.repository.Repository;

public interface TagJpaRepository extends Repository<Tag, Long> {

    List<Tag> findAllByOrderByIdAsc();
}
