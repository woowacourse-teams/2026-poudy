package com.poudy.tag.repository;

import com.poudy.tag.domain.Tags;
import org.springframework.stereotype.Repository;

@Repository
public class TagRepository {

    private final Tags tags;

    public TagRepository(TagJpaRepository tagJpaRepository) {
        this.tags = Tags.from(tagJpaRepository.findAllByOrderByIdAsc());
    }

    public Tags findAll() {
        return tags;
    }
}
