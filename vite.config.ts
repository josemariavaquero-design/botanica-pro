import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    
    return {
      server: {
        port: 3000,
      },
      plugins: [react()],
      // Esto permite usar process.env si algún paquete antiguo lo requiere
      define: {
        'process.env': env
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './'),
        }
      },
      build: {
        outDir: 'dist',
      }
    };
});