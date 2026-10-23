import type { Metadata } from "next";

import { MyFilterScreen } from "@/components/my-filter/MyFilterScreen";

export const metadata: Metadata = {
  title: "나만의 필터",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
};

export default function MyMyFilterPage() {
  return <MyFilterScreen />;
}
