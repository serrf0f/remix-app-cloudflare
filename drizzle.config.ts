import type { Config } from "drizzle-kit";
export default {
  schema: "./app/**/*drizzle*.ts",
  out: "./db",
} satisfies Config;
