package com.poudy.curation.repository;

import com.poudy.curation.domain.Curation;
import com.poudy.curation.domain.Curations;
import com.poudy.exception.InfrastructureException;
import java.util.Optional;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class CurationRepository {

    private final CurationJpaRepository curationJpaRepository;

    public CurationRepository(CurationJpaRepository curationJpaRepository) {
        this.curationJpaRepository = curationJpaRepository;
    }

    private static Curations load(java.util.List<Curation> curations) {
        try {
            return Curations.from(curations);
        } catch (IllegalArgumentException exception) {
            throw new InfrastructureException("큐레이션 데이터가 올바르지 않습니다.", exception);
        }
    }

    public Curations findAll() {
        return load(curationJpaRepository.findAllCurations());
    }

    public Optional<Curation> findPublishedById(Long id) {
        return load(curationJpaRepository.findById(id).stream().toList()).findPublishedById(id);
    }
}
