/** Only allow in-app paths as redirect targets (no open redirects). */
export function safeRedirect(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : null;
}
