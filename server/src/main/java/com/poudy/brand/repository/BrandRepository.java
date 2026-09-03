package com.poudy.brand.repository;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.Brands;
import com.poudy.common.json.JsonDataReader;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class BrandRepository {

    private static final String BRANDS_FILE_NAME = "brands.json";

    private final Brands brands;

    public BrandRepository(JsonDataReader jsonDataReader) {
        this.brands = Brands.from(jsonDataReader.readList(BRANDS_FILE_NAME, Brand.class));
    }

    public Brands findAll() {
        return brands;
    }

    public Optional<Brand> findById(Long id) {
        return brands.findById(id);
    }
}
