import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'fix-gltf-mimetypes',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url.split('?')[0].endsWith('.gltf')) {
            res.setHeader('Content-Type', 'model/gltf+json');
          } else if (req.url.split('?')[0].endsWith('.glb')) {
            res.setHeader('Content-Type', 'model/gltf-binary');
          } else if (req.url.split('?')[0].endsWith('.bin')) {
            res.setHeader('Content-Type', 'application/octet-stream');
          }
          next();
        });
      }
    }
  ],
  assetsInclude: ['**/*.gltf', '**/*.glb', '**/*.bin'],
  server: {
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
