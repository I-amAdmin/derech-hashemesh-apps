import { useColorScheme } from "react-native";

import colors from "@/constants/colors";

type Palette = typeof colors.light;

export function useColors(): Palette & { radius: number } {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const dark = (colors as unknown as { dark?: Palette }).dark;
  const palette: Palette = isDark && dark ? dark : colors.light;
  return { ...palette, radius: colors.radius };
}
