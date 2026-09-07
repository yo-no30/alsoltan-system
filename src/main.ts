import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { supabaseConfigError } from '@/lib/env'
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
    <div style="min-height:100dvh;display:grid;place-items:center;padding:24px;background:#f8fafc;color:#0f172a;font-family:Tahoma,'Segoe UI',sans-serif;">
      <div style="max-width:32rem;width:100%;border:1px solid rgba(226,232,240,.7);background:#fff;border-radius:16px;box-shadow:0 1px 2px rgba(15,23,42,.06);padding:28px;">
        <div style="width:56px;height:56px;margin:0 auto 16px;border-radius:16px;background:#800020;color:#fff;display:grid;place-items:center;font-weight:700;font-size:20px;">س</div>
        <p style="margin:0 0 8px;color:#800020;font-weight:700;font-size:18px;text-align:center;">تعذر تشغيل النظام</p>
        <p style="margin:0;line-height:1.7;color:#334155;text-align:center;">${escapeHtml(message)}</p>
      </div>
    </div>
  `
}

async function bootstrap(): Promise<void> {
  if (supabaseConfigError) {
    renderStartupError(supabaseConfigError)
    return
  }

  const [{ default: App }, { default: router }, { useAuthStore }] = await Promise.all([
    import('./App.vue'),
    import('./router'),
    import('@/stores/auth'),
  ])

  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)
  app.mount('#app')

  const auth = useAuthStore(pinia)
  void auth.initialize()
}

void bootstrap().catch((error: unknown) => {
  console.error('[app] bootstrap failed:', error)
  const message =
    error instanceof Error
      ? error.message
      : 'حدث خطأ غير متوقع أثناء تشغيل التطبيق. افتح وحدة التحكم في المتصفح للمزيد.'
  renderStartupError(message)
})
