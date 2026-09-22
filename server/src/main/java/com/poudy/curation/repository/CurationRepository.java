package com.poudy.curation.repository;

import com.poudy.common.persistence.SnapshotReader;
import com.poudy.curation.domain.Curations;
import com.poudy.exception.InfrastructureException;
import org.springframework.stereotype.Repository;

@Repository
public class CurationRepository {

    private final Curations curations;

    public CurationRepository(CurationJpaRepository curationJpaRepository, SnapshotReader snapshotReader) {
        this.curations = snapshotReader.read(() -> load(curationJpaRepository));
    }

    private static Curations load(CurationJpaRepository curationJpaRepository) {
        try {
            return Curations.from(curationJpaRepository.findAllCurations());
        } catch (IllegalArgumentException exception) {
            throw new InfrastructureException("큐레이션 데이터가 올바르지 않습니다.", exception);
        }
    }

    public Curations findAll() {
        return curations;
    }
}
