package com.poudy.tag.repository;

import com.poudy.tag.domain.Tag;
import com.poudy.tag.domain.TagCategory;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "tag")
public class TagEntity {

    @Id
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "category")
    private TagCategory category;

    @Column(name = "code")
    private String code;

    @Column(name = "name")
    private String name;

    protected TagEntity() {
    }

    public Tag toDomain() {
        return new Tag(id, category, code, name);
    }
}
