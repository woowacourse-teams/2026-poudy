"use client";

import { usePathname } from "next/navigation";

import { isBottomNavigationPath } from "./bottom-navigation-path";
import { BottomNavigation } from "./BottomNavigation";

export function BottomNavigationSlot() {
  const pathname = usePathname();

  return isBottomNavigationPath(pathname) ? <BottomNavigation /> : null;
}
