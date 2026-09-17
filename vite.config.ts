import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command }) => {
  const isBuild = command === "build";

  return {
    plugins: [
      tsconfigPaths(),
      tanstackStart(),

      // Nitro ใช้ตอน build สำหรับ Vercel
      // ไม่โหลดตอน npm run dev
      ...(isBuild ? [nitro()] : []),

      react(),
      tailwindcss(),
    ],
  };
});