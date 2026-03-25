import { onMounted, onUnmounted } from "vue";

/**
 * Forces dark mode on the page by adding the .dark class to <html>.
 * Restores the previous state when the component unmounts.
 */
export function useForceDark() {
  let wasDark = true;

  onMounted(() => {
    wasDark = document.documentElement.classList.contains("dark");
    document.documentElement.classList.add("dark");
  });

  onUnmounted(() => {
    if (!wasDark) {
      document.documentElement.classList.remove("dark");
    }
  });
}
