export default {
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://host.docker.internal:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
}
