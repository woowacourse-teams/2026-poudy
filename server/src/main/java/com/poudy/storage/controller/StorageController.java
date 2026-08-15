package com.poudy.storage.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.Explode;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.hibernate.validator.constraints.UniqueElements;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "보관함", description = "보관함 조회 API")
@RestController
@RequestMapping("/api/storage")
public class StorageController {

    @Operation(summary = "보관함 조회", description = "보관함에 담긴 제품 ID 로 제품 목록 항목과 같은 정보를 한 번에 조회한다. "
            + "받은 ID 를 모두 채워 돌려주므로 페이지를 나누지 않는다. 보관함 자체는 브라우저가 들고 있으며 서버는 저장하지 않는다.")
    @GetMapping
    public ResponseEntity<StorageResponse> findStorageProducts(
            @Parameter(description = "보관함에 담긴 제품 ID. 콤마로 구분한다", example = "101,205", explode = Explode.FALSE, array = @ArraySchema(schema = @Schema(implementation = Long.class, example = "101"), uniqueItems = true)) @RequestParam @UniqueElements List<Long> productIds) {
        return ResponseEntity.ok(StorageResponse.sample(productIds));
    }
}
