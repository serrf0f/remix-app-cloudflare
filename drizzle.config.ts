import type { Config } from "drizzle-kit";
export default {
  schema: "./app/**/*drizzle*.ts",
  out: "./drizzle",
} satisfies Config;
