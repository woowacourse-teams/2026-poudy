package com.poudy.searchkeyword.controller;

import com.poudy.searchkeyword.controller.dto.RankingItem;
import com.poudy.searchkeyword.controller.dto.RankingsResponse;
import com.poudy.searchkeyword.service.SearchKeywordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "인기 검색어", description = "최근 7일 검색량을 약 30초 주기로 갱신한 인기 검색어")
@RestController
@RequestMapping("/api/search-keywords")
public class SearchKeywordController {

    private final SearchKeywordService service;

    public SearchKeywordController(SearchKeywordService service) {
        this.service = service;
    }

    @Operation(summary = "인기 검색어 순위", description = "공개 가능한 완성 검색어를 최대 10개 반환한다. 횟수는 공개하지 않는다.")
    @GetMapping("/rankings")
    public RankingsResponse rankings() {
        return new RankingsResponse(
            service.rankings().stream()
                .map(item -> new RankingItem(item.rank(), item.keyword())).toList()
        );
    }
}
