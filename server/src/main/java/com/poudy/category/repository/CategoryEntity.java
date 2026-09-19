package com.poudy.category.repository;

import com.poudy.category.domain.Category;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "category")
public class CategoryEntity {

    @Id
    private Long id;

    @Column(name = "parent_id")
    private Long parentId;

    @Column(name = "name")
    private String name;

    @Column(name = "depth")
    private Short depth;

    @Column(name = "display_order")
    private Integer displayOrder;

    protected CategoryEntity() {
    }

    public Category toDomain() {
        return new Category(id, parentId, name, depth.intValue());
    }
}
