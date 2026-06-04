import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
    plugins: [vue()],
    // 💡 部署到 GitHub Pages 時，由於網址包含 /forge-fit/ 倉庫名稱，在 production 環境將其作為基礎路徑
    base: process.env.NODE_ENV === 'production' ? '/forge-fit/' : '/',
    server: {
        host: true
    }
})
