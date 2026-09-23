package com.poudy.curation.repository;

import com.poudy.curation.domain.Curation;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

public interface CurationJpaRepository extends Repository<Curation, Long> {

    @Query("select curation from Curation curation order by curation.position")
    List<Curation> findAllCurations();

    Optional<Curation> findById(Long id);
}
