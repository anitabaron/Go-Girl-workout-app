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
    useM3ThemeStore.getState().setColorVariant("blue");

    expect(useM3ThemeStore.getState().colorVariant).toBe("blue");
    expect(document.documentElement.getAttribute("data-m3-variant")).toBe(
      "blue",
    );
  });

  test("supports orange color variant", () => {
    useM3ThemeStore.getState().setColorVariant("orange");

    expect(useM3ThemeStore.getState().colorVariant).toBe("orange");
    expect(document.documentElement.getAttribute("data-m3-variant")).toBe(
      "orange",
    );
  });

  test("supports monochrome color variant", () => {
    useM3ThemeStore.getState().setColorVariant("monochrome");

    expect(useM3ThemeStore.getState().colorVariant).toBe("monochrome");
    expect(document.documentElement.getAttribute("data-m3-variant")).toBe(
      "monochrome",
    );
  });

  test("maps legacy purple to violet attribute", () => {
    useM3ThemeStore.getState().setColorVariant("purple");

    expect(useM3ThemeStore.getState().colorVariant).toBe("violet");
    expect(document.documentElement.getAttribute("data-m3-variant")).toBe(
      "violet",
    );
  });
});
