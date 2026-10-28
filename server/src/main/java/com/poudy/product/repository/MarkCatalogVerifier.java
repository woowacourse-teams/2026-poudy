package com.poudy.product.repository;

import com.poudy.product.domain.Mark;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
class MarkCatalogVerifier implements ApplicationRunner {
    private final JdbcTemplate jdbc;

    MarkCatalogVerifier(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments arguments) {
        List<String> codes = jdbc.queryForList("select code from mark", String.class);
        if (!new HashSet<>(codes).equals(new HashSet<>(Arrays.stream(Mark.values()).map(Mark::code).toList()))) {
            throw new IllegalStateException("DB 마크 코드 목록과 코드 정의가 일치하지 않습니다.");
        }
    }
}
