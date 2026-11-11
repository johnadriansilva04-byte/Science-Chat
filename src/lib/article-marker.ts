/** Marks the last page of the plan so approval can finish the article. */
export const LAST_PAGE_MARKER = "<!--ULTIMA-->";

export function isLastPage(content: string) {
  return content.includes(LAST_PAGE_MARKER);
}

export function stripMarkers(content: string) {
  return content.replace(/<!--\s*ULTIMA\s*-->/g, "").trim();
}
