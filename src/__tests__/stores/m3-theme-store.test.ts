import { beforeEach, describe, expect, test } from "vitest";
import { useM3ThemeStore } from "@/stores/m3-theme-store";

const STORAGE_KEY = "m3-theme-store";

describe("m3-theme-store", () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.setAttribute("data-m3-variant", "pink");

    useM3ThemeStore.setState({
      isDark: null,
      colorVariant: "pink",
    });
  });

  test("applies dark class when dark mode is enabled", () => {
    useM3ThemeStore.getState().setDark(true);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  test("applies color variant data attribute on selection", () => {
    useM3ThemeStore.getState().setColorVariant("expressive-teal");

    expect(useM3ThemeStore.getState().colorVariant).toBe("expressive-teal");
    expect(document.documentElement.getAttribute("data-m3-variant")).toBe(
      "expressive-teal",
    );
  });
});
