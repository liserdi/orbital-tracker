import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// @vitejs/plugin-react уже був у package.json, але без цього файлу
// Vite ніколи його не підключав — JSX працював лише завдяки esbuild
// "з коробки" (бо React імпортується вручну), без Fast Refresh у dev-режимі.
export default defineConfig({
  plugins: [react()],
});
