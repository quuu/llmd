// ASCII splash (generated with figlet -f nancyj)

const SPLASH_LINES = [
  "dP dP                  dP",
  "88 88                  88",
  "88 88 88d8b.d8b. .d888b88",
  "88 88 88'`88'`88 88'  `88",
  "88 88 88  88  88 88.  .88",
  "dP dP dP  dP  dP `88888P8",
];

// ANSI color codes for cyan to blue gradient (top to bottom)
const GRADIENT_COLORS = [
  "\x1b[96m", // Bright cyan (top)
  "\x1b[96m", // Bright cyan
  "\x1b[36m", // Cyan
  "\x1b[36m", // Cyan
  "\x1b[34m", // Blue
  "\x1b[94m", // Bright blue (bottom)
];

const RESET = "\x1b[0m";

// Pure function: generate splash text with gradient
export const generateSplash = (): string => {
  const coloredLines = SPLASH_LINES.map((line, i) => `${GRADIENT_COLORS[i]}${line}${RESET}`);
  return `\n${coloredLines.join("\n")}\n`;
};

// Side effect: print splash to console
export const printSplash = (): void => {
  console.log(generateSplash());
};
