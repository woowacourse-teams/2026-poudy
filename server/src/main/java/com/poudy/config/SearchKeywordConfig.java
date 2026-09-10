package com.poudy.config;

import com.poudy.category.domain.Categories;
import com.poudy.product.repository.ProductRepository;
import com.poudy.searchkeyword.domain.KeywordBuckets;
import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
import com.poudy.searchkeyword.domain.SearchKeywordPolicy;
import com.poudy.searchkeyword.logging.KeywordResourceMonitor;
import com.poudy.searchkeyword.logging.KeywordStoreMonitor;
import com.poudy.searchkeyword.repository.KeywordReportRepository;
import com.poudy.searchkeyword.repository.KeywordSnapshotRepository;
import com.poudy.searchkeyword.repository.SearchKeywordDictionaryRepository;
import com.poudy.searchkeyword.service.KeywordSnapshotWriter;
import com.poudy.searchkeyword.service.SearchKeywordService;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import java.io.IOException;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ResourceLoader;

@Configuration
public class SearchKeywordConfig {
    @Bean
    public Clock searchKeywordClock() {
        return Clock.systemUTC();
    }

    @Bean
    public SearchKeywordRuntime searchKeywordRuntime(
        Environment env,
        ResourceLoader resources,
        ProductRepository products,
        Categories categories,
        @Qualifier("searchKeywordClock") Clock clock,
        MeterRegistry metrics
    )
        throws IOException {
        String prefix = "poudy.search-keywords.";
        int minCount = SearchKeywordPolicy.MIN_COUNT;
        int reportMinCount = SearchKeywordPolicy.REPORT_MIN_COUNT;
        String stateFile = env.matchesProfiles("prod")
            ? "/opt/poudy/state/search-ranking/buckets.json" : "./var/search-ranking/buckets.json";
        String dataDirectory = env.getProperty("poudy.data-dir", "");
        SearchKeywordDictionary dictionary;
        var dictionaryRepository = new SearchKeywordDictionaryRepository();
        var search = new CatalogKeywordSearch(products);
        if (dataDirectory.isBlank()) {
            try (var input = resources.getResource("classpath:search_keywords.json").getInputStream()) {
                dictionary = dictionaryRepository.read(input, search);
            }
        } else {
            dictionary = dictionaryRepository.read(Path.of(dataDirectory).resolve("search_keywords.json"), search);
        }
        KeywordBuckets successful = new KeywordBuckets(clock, SearchKeywordPolicy.RANKING_HOURS);
        Set<String> blocked = Set.of();
        boolean prod = env.matchesProfiles("prod");
        Path file = SearchKeywordPaths.validate(stateFile, prod, dataDirectory);
        var repository = new KeywordSnapshotRepository(file, SearchKeywordPolicy.RANKING_HOURS);
        repository.load().ifPresent(successful::restore);
        KeywordSnapshotWriter writer = new KeywordSnapshotWriter(successful, repository);
        var service = new SearchKeywordService(
            dictionary,
            successful,
            minCount,
            reportMinCount,
            blocked
        );
        Runnable reportExport = null;
        String reportFile = env.getProperty(prefix + "report-file", "");
        if (!reportFile.isBlank()) {
            Path reportPath = SearchKeywordPaths.validate(reportFile, prod, dataDirectory);
            if (reportPath.equals(file)) {
                throw new IllegalArgumentException("Report and snapshot paths must differ");
            }
            String catalogVersion = fingerprint(
                resources,
                dataDirectory,
                List.of(
                    "brands.json",
                    "categories.json",
                    "products.json",
                    "ingredients.json",
                    "tags.json",
                    "exclude_codes.json"
                )
            );
            String searchVersion = env.getProperty(
                prefix + "search-version",
                "build-" + fingerprint(
                    resources,
                    "",
                    List.of(
                        "com/poudy/search/domain/SearchKeyword.class",
                        "com/poudy/product/domain/Products.class"
                    )
                )
            );
            var reportRepository = new KeywordReportRepository(reportPath);
            reportRepository.discardPrevious();
            reportExport = () -> reportRepository.save(service.report(catalogVersion, searchVersion));
        }
        var successMonitor = new KeywordStoreMonitor(successful, "NONZERO", metrics);
        Gauge.builder("poudy.search.snapshot.failures", writer, KeywordSnapshotWriter::failureCount)
            .register(metrics);
        Gauge.builder(
            "poudy.search.snapshot.last.success",
            writer,
            w -> w.lastSuccessfulSaveAt().map(t -> (double) t.getEpochSecond()).orElse(Double.NaN)
        ).register(metrics);
        var resourcesMonitor = new KeywordResourceMonitor(
            writer::failureCount,
            () -> writer.lastSuccessfulSaveAt().map(Instant::getEpochSecond).orElse(-1L)
        );
        return new SearchKeywordRuntime(
            service,
            successful,
            writer,
            reportExport,
            successMonitor,
            resourcesMonitor
        );
    }

    @Bean
    public SearchKeywordService searchKeywordService(SearchKeywordRuntime runtime) {
        return runtime.service();
    }

    @Bean(destroyMethod = "shutdown")
    public ScheduledExecutorService searchKeywordScheduler(SearchKeywordRuntime runtime) {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread thread = new Thread(r, "search-keyword-snapshot");
            thread.setDaemon(true);
            return thread;
        });
        scheduler.scheduleWithFixedDelay(() -> {
            try {
                runtime.successful().expire();
                runtime.writer().run();
                runtime.successMonitor().sample();
                runtime.resourcesMonitor().sample();
                if (runtime.reportExport() != null) {
                    runtime.reportExport().run();
                }
            } catch (RuntimeException exception) {
                org.slf4j.LoggerFactory.getLogger(SearchKeywordConfig.class)
                    .warn("event=search_keyword_maintenance_failed");
            }
        }, SearchKeywordPolicy.SAVE_INTERVAL_SECONDS, SearchKeywordPolicy.SAVE_INTERVAL_SECONDS, TimeUnit.SECONDS);
        return scheduler;
    }

    @Bean(destroyMethod = "shutdown")
    public ScheduledExecutorService searchKeywordRankingScheduler(SearchKeywordRuntime runtime) {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread thread = new Thread(r, "search-keyword-rankings");
            thread.setDaemon(true);
            return thread;
        });
        // 순위는 이 스레드 하나만 만든다. 기동 직후 복원한 집계로 곧바로 한 번 돌고, 이후 30초마다 다시 만든다.
        scheduler.scheduleWithFixedDelay(
            () -> runtime.service().refreshRankings(),
            0,
            SearchKeywordPolicy.RANKING_REFRESH_SECONDS,
            TimeUnit.SECONDS
        );
        return scheduler;
    }

    private static String fingerprint(ResourceLoader resources, String directory, List<String> names)
        throws IOException {
        try {
            var digest = java.security.MessageDigest.getInstance("SHA-256");
            for (String name : names) {
                digest.update(name.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                try (var input = directory.isBlank() ? resources.getResource("classpath:" + name).getInputStream()
                    : java.nio.file.Files.newInputStream(Path.of(directory).resolve(name))) {
                    byte[] buffer = new byte[8192];
                    int read;
                    while ((read = input.read(buffer)) != -1) {
                        digest.update(buffer, 0, read);
                    }
                }
            }
            return java.util.HexFormat.of().formatHex(digest.digest());
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    public record SearchKeywordRuntime(
        SearchKeywordService service,
        KeywordBuckets successful,
        KeywordSnapshotWriter writer,
        Runnable reportExport,
        KeywordStoreMonitor successMonitor,
        KeywordResourceMonitor resourcesMonitor) {
    }
}
