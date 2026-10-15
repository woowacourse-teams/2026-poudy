import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// 부품을 앱 없이 띄워 보는 미리보기 서버. 앱처럼 패키지의 theme.css 만 가져오므로,
// 부품이 쓰는 클래스가 패키지 안에서 만들어지는지도 함께 확인된다.
export default defineConfig({
  root: import.meta.dirname,
  // 견본에 쓰는 그림(피부 타입 등)은 앱의 정적 파일을 그대로 빌려 쓴다.
  publicDir: `${import.meta.dirname}/../../client/public`,
  plugins: [react(), tailwindcss()],
  server: { port: 6006 },
});
