export function buildTranslationKey(
  namespace: string | undefined,
  key: string,
): string {
  if (!namespace) return key;
  if (!key) return namespace;
  if (key.startsWith(`${namespace}.`)) return key;
  return `${namespace}.${key}`;
}
