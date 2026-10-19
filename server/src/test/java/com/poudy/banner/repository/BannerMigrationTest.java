package com.poudy.banner.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

@SpringBootTest
class BannerMigrationTest {
    @Value("${spring.datasource.url}")
    private String url;
    @Value("${spring.datasource.username}")
    private String username;
    @Value("${spring.datasource.password}")
    private String password;

    @Test
    void movesAllBannerDataAndRemovesLegacyColumnsWithoutChangingPublications() {
        String schema = "banner_migration_" + UUID.randomUUID().toString().replace("-", "");
        DataSource source = new DriverManagerDataSource(url, username, password);
        Flyway previous = migration(source, schema, "19");
        try {
            previous.migrate();
            JdbcTemplate jdbc = new JdbcTemplate(source);
            jdbc.update("""
                insert into %s.curation(id,position,title,description,banner_visible,banner_thumbnail_image_url,
                    publication_status,blocks,created_at,updated_at) values
                (12,8,'홍보 제목','요약',true,'https://example.com/banner.png','PUBLISHED',
                    '[{"id":"00000000-0000-4000-8000-000000000001","type":"PRODUCT_LINK","spacingTop":0,
                      "spacingBottom":0,"label":"보기","query":{"keyword":"토너","brandIds":[],
                      "categoryIds":[],"includeIngredientIds":[],"includeGroupCodes":[]}}]',
                    '2026-01-01','2026-02-01'),
                (4,10,'이미지 없는 게시물','요약',false,null,'PUBLISHED','[]','2026-01-02','2026-02-02'),
                (20,12,'미게시','요약',false,'https://example.com/hidden.png','UNPUBLISHED','[]','2026-01-03','2026-02-03')
                """.formatted(schema));
            String snapshotSql = "select jsonb_build_object('id',id,'title',title,'description',description,"
                + "'publicationStatus',publication_status,'blocks',blocks,'createdAt',created_at,'updatedAt',updated_at)::text"
                + " from " + schema + ".curation order by id";
            List<String> before = jdbc.queryForList(snapshotSql, String.class);
            assertThat(migration(source, schema, "20").migrate().migrationsExecuted).isEqualTo(1);
            assertThat(jdbc.queryForList(snapshotSql, String.class)).containsExactlyElementsOf(before);
            assertThat(
                jdbc.queryForList(
                    "select target ->> 'curationId' from " + schema + ".banner order by display_order",
                    String.class
                )
            )
                .containsExactly("12", "4", "20");
            assertThat(
                jdbc.queryForList("select visible from " + schema + ".banner order by display_order", Boolean.class)
            )
                .containsExactly(true, false, false);
            assertThat(
                jdbc.queryForObject(
                    "select image_url from " + schema + ".banner where target ->> 'curationId' = '4'",
                    String.class
                )
            )
                .isNull();
            assertThat(
                jdbc.queryForObject(
                    "select count(*) from " + schema + ".banner b join " + schema
                        + ".curation c on c.id = (b.target ->> 'curationId')::bigint where b.title = c.title and b.description = c.description"
                        + " and b.created_at = c.created_at and b.updated_at = c.updated_at and b.slot = 'MAIN'",
                    Integer.class
                )
            ).isEqualTo(3);
            assertThat(jdbc.queryForList("""
                select column_name from information_schema.columns where table_schema = ? and table_name = 'curation'
                """, String.class, schema)).doesNotContain("position", "banner_visible", "banner_thumbnail_image_url");
            assertThat(jdbc.queryForObject("""
                select count(*) from information_schema.table_constraints
                where table_schema = ? and table_name = 'banner' and constraint_type = 'FOREIGN KEY'
                """, Integer.class, schema)).isZero();
        } finally {
            previous.clean();
        }
    }

    private Flyway migration(DataSource source, String schema, String target) {
        return Flyway.configure().dataSource(source).schemas(schema).defaultSchema(schema)
            .locations("classpath:db/migration").cleanDisabled(false).target(target).load();
    }
}
