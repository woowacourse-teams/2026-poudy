"use client";

// biome-ignore assist/source/organizeImports: 저장소에서 강제하는 ESLint import 순서를 따른다.
import { usePathname } from "next/navigation";

import { isBottomNavigationPath } from "./bottom-navigation-path";
import { BottomNavigation } from "./BottomNavigation";

export function BottomNavigationSlot() {
  const pathname = usePathname();

  return isBottomNavigationPath(pathname) ? <BottomNavigation /> : null;
}
