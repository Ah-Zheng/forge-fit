/**
 * 輕量化、高效的 Canvas 霓虹發光粒子雨 (Confetti) 引擎
 * 專為鍛造健身 (forge-fit) 的暗黑科技風客製化設計
 */

interface Particle {
    x: number
    y: number
    size: number
    color: string
    shadowColor: string
    velocityX: number
    velocityY: number
    rotation: number
    rotationSpeed: number
    opacity: number
}

export class NeonConfetti {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private particles: Particle[] = []
    private animationFrameId: number | null = null
    private isRunning = false

    // 💡 專屬霓虹科技配色：極光青與科技皇家藍，配上對應的霓虹發光陰影
    private colors = [
        { main: '#00F0FF', shadow: 'rgba(0, 240, 255, 0.8)' }, // 極光青
        { main: '#2F80ED', shadow: 'rgba(47, 128, 237, 0.8)' }, // 科技皇家藍
        { main: '#00FF87', shadow: 'rgba(0, 255, 135, 0.8)' } // 成功呼吸綠
    ]

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
        const context = canvas.getContext('2d')
        if (!context) {
            throw new Error('無法初始化 Canvas 2D 上下文')
        }
        this.ctx = context
        this.resizeCanvas()

        // 監聽視窗變化調整 canvas 尺寸
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', this.handleResize)
        }
    }

    private handleResize = () => {
        this.resizeCanvas()
    }

    private resizeCanvas() {
        const rect = this.canvas.parentElement?.getBoundingClientRect()
        this.canvas.width = rect?.width || window.innerWidth
        this.canvas.height = rect?.height || window.innerHeight
    }

    /**
     * 噴射霓虹粒子雨
     * @param count 粒子數量，預設為 80 顆
     */
    public burst(count = 80) {
        this.resizeCanvas()

        // 從底部兩側或中心噴射出霓虹微粒
        for (let i = 0; i < count; i++) {
            const isLeft = Math.random() > 0.5
            const colorObj = this.colors[Math.floor(Math.random() * this.colors.length)]

            this.particles.push({
                // 從螢幕底部兩側向上噴射
                x: isLeft ? 20 : this.canvas.width - 20,
                y: this.canvas.height - 10,
                size: Math.random() * 6 + 4, // 粒徑 4~10px
                color: colorObj.main,
                shadowColor: colorObj.shadow,
                // 向螢幕中心且斜上方噴射的初速度
                velocityX: isLeft ? Math.random() * 8 + 4 : -Math.random() * 8 - 4,
                velocityY: -Math.random() * 15 - 10, // 強力向上衝
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2,
                opacity: 1
            })
        }

        if (!this.isRunning) {
            this.isRunning = true
            this.animate()
        }
    }

    private animate = () => {
        if (!this.isRunning) return

        // 清除畫布，但保持些微半透明，營造出霓虹粒子滑落時的流暢「拖影 (Motion Blur)」特效
        this.ctx.fillStyle = 'rgba(8, 10, 16, 0.3)'
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i]

            // 物理引擎：套用重力與空氣阻力
            p.velocityY += 0.4 // 重力加速度向下
            p.velocityX *= 0.98 // 空氣阻力
            p.x += p.velocityX
            p.y += p.velocityY
            p.rotation += p.rotationSpeed

            // 漸進式淡出
            if (p.velocityY > 2) {
                p.opacity -= 0.015
            }

            // 越過邊界或透明度歸零時移除粒子
            if (p.y > this.canvas.height || p.opacity <= 0 || p.x < 0 || p.x > this.canvas.width) {
                this.particles.splice(i, 1)
                continue
            }

            // 🎨 繪製具有霓虹科技發光感的微型啞鈴/方塊粒子
            this.ctx.save()
            this.ctx.translate(p.x, p.y)
            this.ctx.rotate(p.rotation)
            this.ctx.globalAlpha = p.opacity

            // 💡 關鍵：加入極致的霓虹發光陰影
            this.ctx.shadowColor = p.shadowColor
            this.ctx.shadowBlur = 12
            this.ctx.fillStyle = p.color

            // 繪製一個發光的小長條（科技啞鈴的握柄感）
            this.ctx.fillRect(-p.size, -p.size / 3, p.size * 2, p.size / 1.5)

            // 繪製兩側配重片
            this.ctx.fillRect(-p.size - 2, -p.size / 1.2, 3, p.size * 1.6)
            this.ctx.fillRect(p.size - 1, -p.size / 1.2, 3, p.size * 1.6)

            this.ctx.restore()
        }

        if (this.particles.length > 0) {
            this.animationFrameId = requestAnimationFrame(this.animate)
        } else {
            this.isRunning = false
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId)
                this.animationFrameId = null
            }
            // 結束時完全清空畫布，還原背景
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        }
    }

    /**
     * 銷毀釋放監聽器，防止記憶體洩漏
     */
    public destroy() {
        this.isRunning = false
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId)
        }
        if (typeof window !== 'undefined') {
            window.removeEventListener('resize', this.handleResize)
        }
    }
}
