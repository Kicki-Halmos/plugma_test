/**
 * Convert variable name to kebab-case CSS variable format
 * e.g., "color/brand/200" -> "--color-brand-200"
 */
export const toCSSVariableName = (
  name: string,
  themeSuffix?: string
): string => {
  const baseName = `--${name.toLowerCase().replace(/\//g, "-")}`;
  return themeSuffix ? `${baseName}-${themeSuffix}` : baseName;
};

/**
 * Extract the first part of the variable name (e.g., "color", "font-family", "spacing")
 */
export const getVariablePrefix = (name: string): string => {
  const parts = name.split("/");
  return parts[0];
};

/**
 * Group variables by their first name part (prefix)
 */
export const groupByPrefix = (
  variables: Array<{ name: string; value: string; type: string }>
): Map<string, Array<{ name: string; value: string }>> => {
  return variables.reduce((grouped, variable) => {
    const prefix = getVariablePrefix(variable.name);
    const existing = grouped.get(prefix) || [];
    grouped.set(prefix, [
      ...existing,
      { name: variable.name, value: variable.value },
    ]);
    return grouped;
  }, new Map<string, Array<{ name: string; value: string }>>());
};

/**
 * Group variables by type for better organization
 */
export const groupByType = (
  variables: Array<{ name: string; value: string; type: string }>
): Map<string, Array<{ name: string; value: string }>> => {
  return variables.reduce((grouped, variable) => {
    const type = variable.type.toLowerCase();
    const existing = grouped.get(type) || [];
    grouped.set(type, [
      ...existing,
      { name: variable.name, value: variable.value },
    ]);
    return grouped;
  }, new Map<string, Array<{ name: string; value: string }>>());
};

/**
 * Format CSS variables for a single theme/mode
 */
export const formatCSSVariables = (
  variables: Array<{ name: string; value: string; type: string }>,
  themeName: string,
  customSuffix?: string
): string => {
  if (variables.length === 0) return "";

  const lines: string[] = [];
  const isThemed =
    themeName.toLowerCase() === "dark" || themeName.toLowerCase() === "light";

  // Determine suffix: custom suffix (for responsive modes), themed suffix, or none
  const themeSuffix = customSuffix
    ? customSuffix.toLowerCase()
    : isThemed
      ? themeName.toLowerCase()
      : undefined;

  // Handle responsive modes
  const isResponsiveMode = themeName.startsWith("Responsive-");
  const isResponsiveFixed = themeName === "Responsive";

  let commentName: string;

  if (isResponsiveFixed) {
    commentName = "Responsive";
  } else if (isResponsiveMode) {
    const modeName = themeName.replace("Responsive-", "");
    commentName = modeName; // Use the mode name (S, M, L, etc.) as the headline
  } else if (isThemed) {
    // Use "Light" or "Dark" instead of "Theme"
    commentName =
      themeName.charAt(0).toUpperCase() + themeName.slice(1).toLowerCase();
  } else if (themeName === "Core") {
    commentName = "Core";
  } else {
    commentName = themeName;
  }

  lines.push(`/* ${commentName} */`);

  // Group all variables by their prefix (first name part)
  const grouped = groupByPrefix(variables);

  // Format each group
  const formattedGroups = Array.from(grouped.entries()).map(
    ([groupName, vars]) => {
      // Sort variables alphabetically
      const sortedVars = [...vars].sort((a, b) => a.name.localeCompare(b.name));

      // Format variables
      const varLines = sortedVars.map((variable) => {
        const cssVarName = toCSSVariableName(variable.name, themeSuffix);
        return `${cssVarName}: ${variable.value};`;
      });

      return [`/* ${groupName} */`, ...varLines].join("\n");
    }
  );

  lines.push(...formattedGroups);

  return lines.join("\n");
};

/**
 * Format all theme groups into CSS blocks
 */
export function formatThemeGroups(
  themeGroups: Map<string, Array<{ name: string; value: string; type: string }>>
): string {
  const cssBlocks: string[] = [];

  // Define processing order
  const orderedGroups = [
    { key: "Core", formatter: (vars: any) => formatCSSVariables(vars, "Core") },
    {
      key: "Responsive",
      formatter: (vars: any) => formatCSSVariables(vars, "Responsive"),
    },
  ];

  // Process ordered groups first
  orderedGroups.forEach(({ key, formatter }) => {
    if (themeGroups.has(key)) {
      cssBlocks.push(formatter(themeGroups.get(key)!));
      themeGroups.delete(key);
    }
  });

  // Separate and sort remaining groups
  const remainingKeys = Array.from(themeGroups.keys());
  const responsiveModes = remainingKeys
    .filter((key) => key.startsWith("Responsive-"))
    .sort();
  const otherThemes = remainingKeys
    .filter((key) => !key.startsWith("Responsive-"))
    .sort();

  // Process responsive modes
  responsiveModes.forEach((groupKey) => {
    const vars = themeGroups.get(groupKey)!;
    const modeName = groupKey.replace("Responsive-", "");
    cssBlocks.push(formatCSSVariables(vars, groupKey, modeName));
  });

  // Process other themes
  otherThemes.forEach((themeName) => {
    const vars = themeGroups.get(themeName)!;
    cssBlocks.push(formatCSSVariables(vars, themeName));
  });

  return cssBlocks.join("\n\n");
}
