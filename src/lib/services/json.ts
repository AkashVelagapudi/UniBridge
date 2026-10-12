export function parseStringList(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed
      : [];
  } catch (error) {
    if (error instanceof SyntaxError) return [];
    throw error;
  }
}
