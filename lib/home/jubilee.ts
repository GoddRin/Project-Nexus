/** The designs of the anniversary emblem that can be tried on the hero (?seal=...) */
export const JUBILEE_VARIANTS = ["medal", "lockup", "ribbon", "numeral"] as const;
export type JubileeVariant = (typeof JUBILEE_VARIANTS)[number];
export const isJubileeVariant = (v: unknown): v is JubileeVariant => JUBILEE_VARIANTS.includes(v as JubileeVariant);
