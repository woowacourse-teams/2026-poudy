package com.poudy.youtube.controller;

import com.poudy.youtube.controller.dto.YouTubeChannelResponse;
import com.poudy.youtube.controller.dto.YouTubeProductResponse;
import com.poudy.youtube.controller.dto.YouTubeVideoResponse;
import com.poudy.youtube.service.YouTubeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "유튜버 제품", description = "기존 서비스 제품에 연결된 영상과 발언 조회")
@RestController
public class YouTubeController {
    private final YouTubeService service;

    public YouTubeController(YouTubeService service) {
        this.service = service;
    }

    @Operation(summary = "유튜버 목록", description = "공개 영상에 제품 발언이 있는 채널만 반환한다.")
    @GetMapping("/api/youtube/channels")
    public List<YouTubeChannelResponse> channels(
        @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit,
        @RequestParam(defaultValue = "0") @Min(0) int offset
    ) {
        return service.channels(limit, offset).stream().map(YouTubeChannelResponse::from).toList();
    }

    @Operation(summary = "유튜버의 제품 소개 영상", description = "영상 최신순으로 발언 구간을 함께 반환한다. 없는 채널은 빈 목록이다.")
    @GetMapping("/api/youtube/channels/{channelId}/videos")
    public List<YouTubeVideoResponse> videos(
        @PathVariable String channelId,
        @RequestParam(defaultValue = "10") @Min(1) @Max(50) int limit,
        @RequestParam(defaultValue = "0") @Min(0) int offset
    ) {
        return service.videos(channelId, limit, offset).stream().map(YouTubeVideoResponse::from).toList();
    }

    @Operation(summary = "제품별 유튜브 언급", description = "해당 제품의 발언만 반환한다. 추천 횟수는 채널별 명확한 추천 영상 수다.")
    @GetMapping("/api/products/{productId}/youtube-mentions")
    public List<YouTubeVideoResponse> productMentions(
        @PathVariable @Min(1) long productId,
        @RequestParam(defaultValue = "10") @Min(1) @Max(50) int limit,
        @RequestParam(defaultValue = "0") @Min(0) int offset
    ) {
        return service.productMentions(productId, limit, offset).stream().map(YouTubeVideoResponse::from).toList();
    }

    @Operation(summary = "유튜버 정보")
    @GetMapping("/api/youtube/channels/{channelId}")
    public YouTubeChannelResponse channel(@PathVariable String channelId) {
        return YouTubeChannelResponse.from(service.channel(channelId));
    }

    @Operation(summary = "유튜버가 소개한 제품", description = "최근1년 영상 기준 추천 횟수순이다. 정보성 언급은 추천0회다.")
    @GetMapping("/api/youtube/channels/{channelId}/products")
    public List<YouTubeProductResponse> products(@PathVariable String channelId) {
        return service.products(channelId).stream().map(YouTubeProductResponse::from).toList();
    }

}
