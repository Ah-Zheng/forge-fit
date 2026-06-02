import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 響應式媒體查詢 Hook，用來監聽螢幕寬度與裝置變化
 * @param query 媒體查詢字串，例如 '(max-width: 768px)'
 * @returns 響應式布林值 Ref
 */
export function useMediaQuery(query: string) {
    const matches = ref(false)

    if (typeof window === 'undefined') {
        return matches
    }

    const mediaQuery = window.matchMedia(query)
    const listener = (event: MediaQueryListEvent) => {
        matches.value = event.matches
    }

    onMounted(() => {
        matches.value = mediaQuery.matches
        mediaQuery.addEventListener('change', listener)
    })

    onUnmounted(() => {
        mediaQuery.removeEventListener('change', listener)
    })

    return matches
}
