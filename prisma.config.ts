import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    // never connected to – type checking only
    url: "postgresql://user:pass@localhost:5432/db",
  },
});
