package com.poudy.curation.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.common.json.JsonDataReader;
import com.poudy.curation.domain.Curation;
import com.poudy.exception.InfrastructureException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;

class CurationRepositoryTest {

    @Test
    void loadsPublicContentInBannerOrderWithoutResolvingMissingProducts() throws IOException {
        CurationRepository repository = reading(fixture());
        assertThat(repository.findAll().inOrder()).extracting(Curation::id).containsExactly(12L, 4L);
        assertThat(repository.findAll().findById(12L).orElseThrow().banner().title())
            .isEqualTo("환절기 장벽 케어");
    }

    @Test
    void permitsEmptyCatalog() {
        assertThat(reading("{\"curations\":[]}").findAll().inOrder()).isEmpty();
    }

    @ParameterizedTest
    @CsvSource({
            "thumbnail_image_url,thumbnail_image_typo",
            "VISIBLE,UNKNOWN",
            "IMAGE,UNKNOWN",
            "00000000-0000-4000-8000-000000000012,invalid-uuid",
            "spacing_top,spacing_typo"
    })
    void rejectsInvalidSavedData(String from, String to) throws IOException {
        String invalid = fixture().replaceFirst(from, to);
        assertThatThrownBy(() -> reading(invalid)).isInstanceOf(InfrastructureException.class);
    }

    @Test
    void rejectsWrongScalarTypesAndNumericOverflow() throws IOException {
        String json = fixture();
        assertThatThrownBy(() -> reading(json.replaceFirst("\"id\": 12", "\"id\": 1.2")))
            .isInstanceOf(InfrastructureException.class);
        assertThatThrownBy(() -> reading(json.replaceFirst("\"spacing_top\": 8", "\"spacing_top\": 2147483648")))
            .isInstanceOf(InfrastructureException.class);
    }

    private static String fixture() throws IOException {
        return new ClassPathResource("curations.json").getContentAsString(StandardCharsets.UTF_8);
    }

    private static CurationRepository reading(String json) {
        DefaultResourceLoader loader = new DefaultResourceLoader() {
            @Override
            public Resource getResource(String location) {
                return new ByteArrayResource(json.getBytes(StandardCharsets.UTF_8));
            }
        };
        return new CurationRepository(new JsonDataReader(loader));
    }
}
