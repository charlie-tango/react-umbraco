import type { CSSProperties } from "react";

/**
 * Convert a kebab-case string to camelCase.
 * @param value
 */
const toCamelCase = (value: string) => {
  return value.replace(/-([a-z])/g, (g) => {
    return g[1]?.toUpperCase() ?? "";
  });
};

/**
 * Parse a style string into a CSSProperties object.
 * This is a basic conversion, that does not do any validation of the style properties.
 * @param style
 */
export const parseStyle = (style: string) => {
  const styleProps: Record<string, string> = {};
  if (!style) {
    // Return an empty object if no style string is provided
    return styleProps as CSSProperties;
  }

  const styleElements = style.trim().split(";");
  for (const el of styleElements) {
    let [property, value] = el.split(":");
    if (!property || value === undefined) continue;
    property = property.trim();
    if (!property.startsWith("--")) {
      // Convert kebab-case to camelCase for CSS properties
      property = toCamelCase(property);
    }
    styleProps[property] = value.trim();
  }

  return styleProps as CSSProperties;
};
