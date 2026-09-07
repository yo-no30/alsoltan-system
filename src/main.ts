import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'
import { supabaseConfigError } from '@/lib/supabase'
import './assets/main.css'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderStartupError(message: string): void {
  const root = document.getElementById('app')
  if (!root) {
    return
  }

  root.innerHTML = `
    <div style="min-height:100dvh;display:grid;place-items:center;padding:24px;background:#f8fafc;color:#0f172a;font-family:Tahoma,Segoe UI,sans-serif;">
      <div style="max-width:32rem;width:100%;border:1px solid rgba(226,232,240,.7);background:#fff;border-radius:16px;box-shadow:0 1px 2px rgba(15,23,42,.06);padding:28px;">
        <p style="margin:0 0 8px;color:#800020;font-weight:700;font-size:18px;">تعذر تشغيل النظام</p>
        <p style="margin:0;line-height:1.7;color:#334155;">${escapeHtml(message)}</p>
      </div>
    </div>
  `
}

async function bootstrap(): Promise<void> {
  if (supabaseConfigError) {
    renderStartupError(supabaseConfigError)
    return
  }

  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)

  const auth = useAuthStore(pinia)
  await auth.initialize()

  app.use(router)
  app.mount('#app')
}

void bootstrap().catch((error: unknown) => {
  console.error('[app] bootstrap failed:', error)
  const message =
    error instanceof Error
      ? error.message
      : 'حدث خطأ غير متوقع أثناء تشغيل التطبيق. افتح وحدة التحكم في المتصفح للمزيد.'
  renderStartupError(message)
})
