/** Elements rendered without children, matching the core safe vocabulary. */
export const VOID_TAGS = new Set(["br", "hr", "img"]);

/**
 * Map the core semantic AST attributes onto React props. Navigation and media URLs are
 * resolved by their own components, so they are never forwarded verbatim.
 */
export function reactAttributes(
  attributes: Record<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(attributes)) {
    if (name === "href" || name === "src") continue;
    if (name === "colspan") result.colSpan = Number(value);
    else if (name === "rowspan") result.rowSpan = Number(value);
    else if (name === "datetime") result.dateTime = value;
    else if (name === "class") result.className = value;
    else if (name === "open" || name === "reversed") result[name] = true;
    else result[name] = value;
  }
  return result;
}
