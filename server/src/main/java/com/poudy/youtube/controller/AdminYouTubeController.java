package com.poudy.youtube.controller;

import com.poudy.youtube.controller.dto.YouTubeChannelOrderResponse;
import com.poudy.youtube.controller.dto.YouTubeOrderRequest;
import com.poudy.youtube.service.YouTubeService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/youtube/channels")
public class AdminYouTubeController {
    private final YouTubeService service;
    public AdminYouTubeController(YouTubeService service) {
        this.service = service;
    }

    @GetMapping
    public List<YouTubeChannelOrderResponse> channels() {
        return service.channelOrder().stream().map(YouTubeChannelOrderResponse::from).toList();
    }

    @PatchMapping("/{channelId}/order")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateOrder(@PathVariable String channelId, @RequestBody @Valid YouTubeOrderRequest request) {
        service.updateOrder(channelId, request.displayOrder());
    }
}
