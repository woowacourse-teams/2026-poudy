package com.poudy.product.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ManufacturerSchemaTest {
    @Autowired
    private JdbcTemplate jdbc;

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "\t"})
    public void rejectsBlankName(String name) {
        assertThatThrownBy(() -> jdbc.update("insert into manufacturer(id, name) values (1, ?)", name))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    public void rejectsNullName() {
        assertThatThrownBy(() -> jdbc.update("insert into manufacturer(id, name) values (1, null)"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    public void rejectsDuplicateName() {
        jdbc.update("insert into manufacturer(id, name) values (1, '코스맥스')");
        assertThatThrownBy(() -> jdbc.update("insert into manufacturer(id, name) values (2, '코스맥스')"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    public void rejectsNonNfcName() {
        assertThatThrownBy(() -> jdbc.update("insert into manufacturer(id, name) values (1, ?)", "Estée Lauder"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    public void storesTimestamps() {
        jdbc.update("insert into manufacturer(id, name) values (1, 'Estée Lauder Companies')");
        assertThat(
            jdbc.queryForObject(
                "select count(*) from manufacturer where created_at is not null and updated_at is not null",
                Long.class
            )
        )
            .isEqualTo(1);
    }

    @Test
    public void linksProductToManufacturerAndCountry() {
        jdbc.update("insert into manufacturer(id, name) values (1, '코스맥스')");
        jdbc.update("update product set manufacturer_id = 1, manufacturing_country = 'KR' where id = 1");
        assertThat(
            jdbc.queryForObject(
                "select manufacturing_country from product where id = 1 and manufacturer_id = 1",
                String.class
            )
        )
            .isEqualTo("KR");
    }

    @Test
    public void allowsProductWithoutManufacturerOrCountry() {
        assertThat(
            jdbc.queryForObject(
                "select count(*) from product where id = 1 and manufacturer_id is null and manufacturing_country is null",
                Long.class
            )
        )
            .isEqualTo(1);
    }

    @Test
    public void rejectsUnknownManufacturer() {
        assertThatThrownBy(() -> jdbc.update("update product set manufacturer_id = 99999999 where id = 1"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"kr", "DE", "K", "KOR"})
    public void rejectsCountryOutsideAllowedCodes(String country) {
        assertThatThrownBy(() -> jdbc.update("update product set manufacturing_country = ? where id = 1", country))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    public void rejectsDeletionOfLinkedManufacturer() {
        jdbc.update("insert into manufacturer(id, name) values (1, '코스맥스')");
        jdbc.update("update product set manufacturer_id = 1 where id = 1");
        assertThatThrownBy(() -> jdbc.update("delete from manufacturer where id = 1"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }
}
