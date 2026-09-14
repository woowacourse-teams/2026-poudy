package com.poudy.searchkeyword.controller;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.exception.GlobalExceptionHandler;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import com.poudy.searchkeyword.service.SearchKeywordService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SearchKeywordControllerTest {
    @Test
    void exposesOnlyRankAndKeywordAndEmptyArray() throws Exception {
        SearchKeywordService service = mock(SearchKeywordService.class);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new SearchKeywordController(service)).build();
        given(service.rankings()).willReturn(List.of(new RankedKeyword(1, "토너")));
        mvc.perform(get("/api/search-keywords/rankings?limit=100"))
            .andExpect(status().isOk()).andExpect(content().json("{\"items\":[{\"rank\":1,\"keyword\":\"토너\"}]}"));
        given(service.rankings()).willReturn(List.of());
        mvc.perform(get("/api/search-keywords/rankings")).andExpect(status().isOk())
            .andExpect(content().json("{\"items\":[]}"));
    }

    @Test
    void delegatesUnexpectedFailuresToExistingHandler() throws Exception {
        SearchKeywordService service = mock(SearchKeywordService.class);
        given(service.rankings()).willThrow(new IllegalStateException("internal"));
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new SearchKeywordController(service))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(get("/api/search-keywords/rankings")).andExpect(status().isInternalServerError())
            .andExpect(
                org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.code")
                    .value("INTERNAL_SERVER_ERROR")
            );
    }

    @Test
    void recordsSubmittedKeyword() throws Exception {
        SearchKeywordService service = mock(SearchKeywordService.class);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new SearchKeywordController(service)).build();

        mvc.perform(
            post("/api/search-keywords").contentType(MediaType.APPLICATION_JSON).content("{\"keyword\":\" 독도  토너 \"}")
        ).andExpect(status().isNoContent());

        verify(service).record(new SearchKeyword("독도 토너"));
    }

    @Test
    void rejectsKeywordsThatNormalizeToNothing() throws Exception {
        SearchKeywordService service = mock(SearchKeywordService.class);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new SearchKeywordController(service))
            .setControllerAdvice(new GlobalExceptionHandler()).build();

        mvc.perform(
            post("/api/search-keywords").contentType(MediaType.APPLICATION_JSON).content("{\"keyword\":\"\\u200b\"}")
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));
        mvc.perform(post("/api/search-keywords").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));

        verifyNoInteractions(service);
    }
}
