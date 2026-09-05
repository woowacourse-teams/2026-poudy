package com.poudy.feedback.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.nio.file.Path;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("HEIC 이미지 디코더")
class HeicImageDecoderTest {

    @Test
    @DisplayName("외부 프로세스에 서버 환경 변수를 전달하지 않는다")
    void clearsChildProcessEnvironment() {
        HeicImageDecoder decoder = new HeicImageDecoder();
        ProcessBuilder process = decoder.decoderProcess(
            Path.of("input.heic"),
            Path.of("output.jpg")
        );

        assertThat(process.environment()).isEmpty();
    }

    @Test
    @DisplayName("외부 프로세스에 주소 공간, 출력 크기, CPU 제한을 적용한다")
    void configuresResourceLimits() {
        HeicImageDecoder decoder = new HeicImageDecoder();
        ProcessBuilder process = decoder.decoderProcess(
            Path.of("input.heic"),
            Path.of("output.jpg")
        );

        assertThat(Path.of(process.command().get(0)).getFileName().toString()).isEqualTo("prlimit");
        assertThat(Path.of(process.command().get(5)).getFileName().toString()).isEqualTo("heif-convert");
        assertThat(process.command())
            .containsSubsequence("--as=402653184", "--fsize=33554432", "--cpu=15", "--")
            .contains("--quiet", "-q", "95");
        assertThat(process.redirectOutput()).isEqualTo(ProcessBuilder.Redirect.DISCARD);
        assertThat(process.redirectError()).isEqualTo(ProcessBuilder.Redirect.DISCARD);
    }

    @Test
    @DisplayName("HEIC 런타임 실행 파일이 준비되면 검증을 통과한다")
    void acceptsRuntimeWithExecutables() throws Exception {
        HeicImageDecoder decoder = decoderWithCurrentJavaExecutable();

        decoder.validateRuntime();
    }

    @Test
    @DisplayName("HEIC 실행 파일이 없으면 거절한다")
    void rejectsRuntimeWithoutExecutables() {
        HeicImageDecoder decoder = new HeicImageDecoder(
            Path.of("missing-prlimit"),
            Path.of("missing-heif-convert")
        );

        assertThatThrownBy(() -> decoder.decodeToJpeg(new byte[] {1}))
            .isInstanceOf(IOException.class)
            .hasMessage("HEIC 디코딩 실행 파일을 사용할 수 없습니다.");
    }

    private static HeicImageDecoder decoderWithCurrentJavaExecutable() {
        Path javaExecutable = Path.of(
            System.getProperty("java.home"),
            "bin",
            System.getProperty("os.name").startsWith("Windows") ? "java.exe" : "java"
        );
        return new HeicImageDecoder(javaExecutable, javaExecutable);
    }
}
