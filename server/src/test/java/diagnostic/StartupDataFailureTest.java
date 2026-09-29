package diagnostic;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.exception.GlobalExceptionHandler;
import com.poudy.exception.InfrastructureException;
import com.poudy.excludecode.controller.ExcludeCodeController;
import com.poudy.excludecode.repository.ExcludeCodeRepository;
import com.poudy.excludecode.service.ExcludeCodeService;
import com.poudy.searchkeyword.controller.SearchKeywordController;
import com.poudy.searchkeyword.domain.bucket.KeywordBucketView;
import com.poudy.searchkeyword.domain.bucket.KeywordBuckets;
import com.poudy.searchkeyword.domain.dictionary.SearchKeywordDictionary;
import com.poudy.searchkeyword.domain.ranking.RankingFallback;
import com.poudy.searchkeyword.domain.ranking.RankingPolicy;
import com.poudy.searchkeyword.repository.SearchKeywordDictionaryRepository;
import com.poudy.searchkeyword.service.KeywordSearch;
import com.poudy.searchkeyword.service.SearchKeywordRankingService;
import com.poudy.searchkeyword.service.SearchKeywordService;
import com.poudy.searchkeyword.service.SearchKeywordSnapshot;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

class StartupDataFailureTest {

    @Test
    @ExtendWith(OutputCaptureExtension.class)
    void missingExcludeDefinitionsDoNotStopSpringOrUnrelatedEndpoints(CapturedOutput output) throws Exception {
        try (ConfigurableApplicationContext context = start(ExcludeConfiguration.class)) {
            assertThat(context.isActive()).isTrue();
            var mvc = MockMvcBuilders.standaloneSetup(
                context.getBean(ExcludeCodeController.class),
                new UnrelatedController()
            ).setControllerAdvice(new GlobalExceptionHandler()).build();

            mvc.perform(get("/unrelated")).andExpect(status().isOk());
            mvc.perform(get("/api/exclude-codes")).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR"));

            ExcludeCodeRepository repository = context.getBean(ExcludeCodeRepository.class);
            assertThatThrownBy(() -> repository.codesOf(9L)).isInstanceOf(InfrastructureException.class);
            assertThat(repository.codesOf(9L)).isEmpty();
            assertThat(output).contains("Infrastructure failure").contains("제외 성분군 정의를 찾지 못했습니다");
        }
    }

    @Test
    @ExtendWith(OutputCaptureExtension.class)
    void dictionaryFailureDoesNotStopSpringAndTheNextRefreshRecoversRankings(CapturedOutput output) throws Exception {
        try (ConfigurableApplicationContext context = start(DictionaryConfiguration.class)) {
            assertThat(context.isActive()).isTrue();
            SearchKeywordSnapshot snapshot = context.getBean(SearchKeywordSnapshot.class);
            assertThat(snapshot.isInitialized()).isFalse();
            var mvc = MockMvcBuilders.standaloneSetup(
                context.getBean(SearchKeywordController.class),
                new UnrelatedController()
            ).setControllerAdvice(new GlobalExceptionHandler()).build();

            mvc.perform(get("/unrelated")).andExpect(status().isOk());
            mvc.perform(get("/api/search-keywords/rankings")).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR"));

            context.getBean(SearchKeywordRankingService.class).refreshOnSchedule();

            assertThat(snapshot.isInitialized()).isTrue();
            mvc.perform(get("/api/search-keywords/rankings")).andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0));
            assertThat(output).contains("event=search_keyword_rankings_refresh_failed")
                .contains("검색어 사전 조회 실패");
        }
    }

    private static ConfigurableApplicationContext start(Class<?> configuration) {
        SpringApplication application = new SpringApplication(configuration);
        application.setWebApplicationType(WebApplicationType.NONE);
        application.setBannerMode(Banner.Mode.OFF);
        return application.run();
    }

    @RestController
    static class UnrelatedController {
        @GetMapping("/unrelated")
        String unrelated() {
            return "ok";
        }
    }

    @Configuration(proxyBeanMethods = false)
    @Import({ExcludeCodeRepository.class, ExcludeCodeService.class, ExcludeCodeController.class})
    static class ExcludeConfiguration {
        @Bean
        NamedParameterJdbcTemplate namedParameterJdbcTemplate() {
            NamedParameterJdbcTemplate jdbc = mock(NamedParameterJdbcTemplate.class);
            when(jdbc.queryForObject(anyString(), any(MapSqlParameterSource.class), eq(Long.class)))
                .thenReturn(0L, 1L);
            when(jdbc.queryForList(anyString(), any(MapSqlParameterSource.class), eq(String.class)))
                .thenReturn(List.of());
            return jdbc;
        }
    }

    @Configuration(proxyBeanMethods = false)
    @Import({SearchKeywordRankingService.class, SearchKeywordService.class, SearchKeywordController.class})
    static class DictionaryConfiguration {
        @Bean
        SearchKeywordDictionaryRepository dictionaryRepository() {
            SearchKeywordDictionaryRepository repository = mock(SearchKeywordDictionaryRepository.class);
            when(repository.read()).thenThrow(new InfrastructureException("검색어 사전 조회 실패"))
                .thenReturn(SearchKeywordDictionary.of(List.of()));
            return repository;
        }

        @Bean
        KeywordBuckets keywordBuckets() {
            KeywordBuckets buckets = mock(KeywordBuckets.class);
            when(buckets.view()).thenReturn(new KeywordBucketView(Map.of()));
            when(buckets.comparisonView()).thenReturn(Optional.empty());
            return buckets;
        }

        @Bean
        KeywordSearch keywordSearch() {
            return keyword -> true;
        }

        @Bean
        RankingPolicy rankingPolicy() {
            return new RankingPolicy(1, 5, Set.of());
        }

        @Bean
        RankingFallback rankingFallback() {
            return RankingFallback.of(List.of());
        }

        @Bean
        SearchKeywordSnapshot snapshot() {
            return new SearchKeywordSnapshot();
        }

        @Bean
        Clock clock() {
            return Clock.systemUTC();
        }
    }
}
