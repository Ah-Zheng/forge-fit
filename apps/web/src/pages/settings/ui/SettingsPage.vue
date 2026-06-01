<script setup lang="ts">
import { Settings } from 'lucide-vue-next'
</script>

<template>
  <div class="glass-card" style="animation: fadeInUp 0.4s ease forwards;">
    <div class="card-header" style="margin-bottom: 0;">
      <div class="card-title-group">
        <Settings class="text-cyan" :size="24" style="filter: drop-shadow(0 0 4px var(--color-cyan));" />
        <h2>系統設定與備份</h2>
      </div>
    </div>
    <p style="color: var(--text-sub); margin-top: 1rem; line-height: 1.6;">
      在此綁定您的 Google 雲端硬碟帳號。我們將在隨後步驟實作 OAuth 2.0 與雲端備份 json 上傳邏輯！
    </p>
  </div>
</template>
