package com.poudy.brand.repository;

import com.poudy.brand.domain.Brand;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "brand")
public class BrandEntity {

    @Id
    private Long id;

    @Column(name = "korean_name")
    private String koreanName;

    @Column(name = "english_name")
    private String englishName;

    @Column(name = "image_url")
    private String imageUrl;

    protected BrandEntity() {
    }

    public Brand toDomain() {
        return new Brand(id, koreanName, englishName, imageUrl);
    }
}
