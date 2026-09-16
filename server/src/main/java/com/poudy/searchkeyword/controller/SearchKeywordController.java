package com.poudy.searchkeyword.controller;

import com.poudy.search.domain.SearchKeyword;
import com.poudy.searchkeyword.controller.dto.RankingsResponse;
import com.poudy.searchkeyword.controller.dto.SearchKeywordRequest;
import com.poudy.searchkeyword.service.SearchKeywordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "인기 검색어", description = "최근 7일 검색량을 10분마다 갱신한 인기 검색어")
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
        return RankingsResponse.from(service.rankings());
    }

    @Operation(summary = "검색어 집계", description = "제출한 검색어를 인기 검색어 집계에 더한다. 지금 상품이 검색되지 않는 검색어는 세지 않는다.")
    @ApiResponse(responseCode = "204", description = "요청을 처리함")
    @PostMapping
    public ResponseEntity<Void> record(@Valid @RequestBody SearchKeywordRequest request) {
        service.record(new SearchKeyword(request.keyword()));
        return ResponseEntity.noContent().build();
    }
}
