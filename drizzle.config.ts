import type { Config } from "drizzle-kit";
export default {
  dialect: "sqlite",
  schema: "./app/**/*drizzle*.ts",
  out: "./drizzle",
} satisfies Config;
