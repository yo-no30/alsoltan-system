import { onMounted, onUnmounted } from 'vue'
import { useOfflineQueueStore } from '@/stores/offlineQueue'
import { useSales } from '@/composables/useSales'

export function useOfflineSync() {
  const offlineQueue = useOfflineQueueStore()
  const { flushOfflineQueue } = useSales()

  async function handleOnline(): Promise<void> {
    try {
      await flushOfflineQueue()
    } catch (error) {
      console.error('[useOfflineSync] online flush failed:', error)
    }
  }

  onMounted(() => {
    void (async () => {
      await offlineQueue.loadQueue()
      if (navigator.onLine) {
        await flushOfflineQueue()
      }
    })()

    window.addEventListener('online', handleOnline)
  })

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
  })

  return {
    flushOfflineQueue,
  }
}
