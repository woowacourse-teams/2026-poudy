package com.poudy.searchkeyword.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.poudy.searchkeyword.domain.bucket.KeywordBucketView;
import com.poudy.searchkeyword.domain.bucket.KeywordBuckets;
import com.poudy.searchkeyword.domain.dictionary.SearchKeywordDictionary;
import com.poudy.searchkeyword.domain.ranking.RankingFallback;
import com.poudy.searchkeyword.domain.ranking.RankingPolicy;
import com.poudy.searchkeyword.repository.SearchKeywordDictionaryRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.ScheduledAnnotationBeanPostProcessor;
import org.springframework.scheduling.config.CronTask;
import org.springframework.scheduling.support.CronExpression;

class SearchKeywordRankingSchedulingTest {
    private final SearchKeywordDictionaryRepository repository = mock(SearchKeywordDictionaryRepository.class);
    private final KeywordBuckets buckets = mock(KeywordBuckets.class);
    private final SearchKeywordDictionary dictionary = SearchKeywordDictionary.of(List.of());
    private final SearchKeywordSnapshot snapshot = new SearchKeywordSnapshot(dictionary);

    @Test
    void ignoresScheduleBeforeStartupAndRefreshesOnceWhenTheApplicationIsReady() {
        SearchKeywordRankingService service = service();

        service.refreshOnSchedule();

        verifyNoInteractions(repository);

        service.refreshAfterApplicationReady();
        service.refreshAfterApplicationReady();

        verify(repository).read();
    }

    @Test
    void refreshesAtEachScheduledInvocationAfterStartup() {
        SearchKeywordRankingService service = service();
        service.refreshAfterApplicationReady();

        service.refreshOnSchedule();
        service.refreshOnSchedule();

        verify(repository, times(3)).read();
    }

    @Test
    void retriesOnTheNextScheduleWhenTheStartupRefreshFails() {
        SearchKeywordRankingService service = service();
        when(repository.read()).thenThrow(new IllegalStateException("dictionary unavailable")).thenReturn(dictionary);

        service.refreshAfterApplicationReady();
        service.refreshOnSchedule();

        verify(repository, times(2)).read();
        assertThat(snapshot.refreshedAt()).isPresent();
    }

    @Test
    void springRegistersOneTenMinuteCronAndRefreshesOnceOnApplicationReady() {
        try (var context = new AnnotationConfigApplicationContext(SchedulingTestConfig.class)) {
            var processor = context.getBean(ScheduledAnnotationBeanPostProcessor.class);
            SearchKeywordDictionaryRepository repository = context.getBean(SearchKeywordDictionaryRepository.class);

            assertThat(processor.getScheduledTasks()).singleElement().satisfies(scheduled -> {
                assertThat(scheduled.getTask()).isInstanceOfSatisfying(CronTask.class, cronTask -> {
                    assertThat(cronTask.getExpression()).isEqualTo("0 */10 * * * *");
                    CronExpression cron = CronExpression.parse(cronTask.getExpression());
                    assertThat(cron.next(LocalDateTime.parse("2026-09-21T10:34:00")))
                        .isEqualTo(LocalDateTime.parse("2026-09-21T10:40:00"));
                });
            });
            verifyNoInteractions(repository);

            context.publishEvent(mock(ApplicationReadyEvent.class));
            context.publishEvent(mock(ApplicationReadyEvent.class));

            verify(repository).read();
        }
    }

    private SearchKeywordRankingService service() {
        when(repository.read()).thenReturn(dictionary);
        when(buckets.view()).thenReturn(new KeywordBucketView(Map.of()));
        when(buckets.comparisonView()).thenReturn(Optional.empty());
        return new SearchKeywordRankingService(
            repository,
            buckets,
            ignored -> true,
            new RankingPolicy(5, 10, Set.of()),
            RankingFallback.of(List.of()),
            snapshot,
            Clock.systemUTC()
        );
    }

    @Configuration(proxyBeanMethods = false)
    @EnableScheduling
    static class SchedulingTestConfig {
        @Bean
        TaskScheduler taskScheduler() {
            return mock(TaskScheduler.class);
        }

        @Bean
        SearchKeywordDictionaryRepository searchKeywordDictionaryRepository() {
            return mock(SearchKeywordDictionaryRepository.class);
        }

        @Bean
        SearchKeywordRankingService searchKeywordRankingService(SearchKeywordDictionaryRepository repository) {
            SearchKeywordDictionary dictionary = SearchKeywordDictionary.of(List.of());
            KeywordBuckets buckets = mock(KeywordBuckets.class);
            when(repository.read()).thenReturn(dictionary);
            when(buckets.view()).thenReturn(new KeywordBucketView(Map.of()));
            when(buckets.comparisonView()).thenReturn(Optional.empty());
            return new SearchKeywordRankingService(
                repository,
                buckets,
                ignored -> true,
                new RankingPolicy(5, 10, Set.of()),
                RankingFallback.of(List.of()),
                new SearchKeywordSnapshot(dictionary),
                Clock.systemUTC()
            );
        }
    }
}
