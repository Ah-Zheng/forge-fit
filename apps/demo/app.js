// forge-fit Web App & PWA Logic - Mobile Interactive Prototype

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Lucide Icons
    lucide.createIcons()

    // 2. Set Current Date
    displayCurrentDate()

    // 3. Initialize PWA Navigation Tab Switcher
    initPwaNavigation()

    // 4. Initialize Chart
    initMuscleChart()

    // 5. Register Event Listeners & Touch Steppers
    registerEventListeners()

    // Recalculate Dashboard Stats & Custom Legends
    recalculateDashboard()

    // 6. Register Service Worker for Offline PWA Support
    registerServiceWorker()
})

// App State
let myChart = null

// PWA Tab Switching Logic
function initPwaNavigation() {
    const navItems = document.querySelectorAll('.mobile-nav-item, .menu-item')
    const pages = document.querySelectorAll('.app-page')
    const pageTitle = document.getElementById('page-title')

    const titleMap = {
        'page-dashboard': '今日訓練看板',
        'page-logger': '今日重量日誌',
        'page-library': '常用器材動作庫'
    }

    navItems.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault()
            const targetPageId = item.getAttribute('data-target')
            if (!targetPageId) return

            // Update Nav visual states across desktop & mobile navs
            navItems.forEach(nav => {
                if (nav.getAttribute('data-target') === targetPageId) {
                    nav.classList.add('active')
                } else {
                    nav.classList.remove('active')
                }
            })

            // Switch visible views with transition
            pages.forEach(page => {
                if (page.id === targetPageId) {
                    page.classList.add('active')
                } else {
                    page.classList.remove('active')
                }
            })

            // Update Header Title dynamically
            if (pageTitle && titleMap[targetPageId]) {
                pageTitle.textContent = titleMap[targetPageId]
            }
        })
    })
}

// Date formatter in Traditional Chinese
function displayCurrentDate() {
    const dateEl = document.getElementById('current-date')
    if (!dateEl) return

    const now = new Date()
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    const formatted = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`
    dateEl.textContent = formatted
}

// Chart.js Configuration
function initMuscleChart() {
    const ctx = document.getElementById('muscleDistributionChart').getContext('2d')

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['胸部', '背部', '腿部', '肩膀', '手臂'],
            datasets: [
                {
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: [
                        'rgba(47, 128, 237, 0.85)', // Royal Blue
                        'rgba(0, 240, 255, 0.85)', // Neon Cyan
                        'rgba(155, 93, 229, 0.85)', // Purple
                        'rgba(241, 91, 181, 0.85)', // Magenta
                        'rgba(254, 228, 64, 0.85)' // Yellow
                    ],
                    borderColor: '#0c0e18',
                    borderWidth: 3,
                    hoverBorderColor: '#00F0FF',
                    hoverBorderWidth: 1,
                    cutout: '72%'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#121624',
                    titleColor: '#FFF',
                    bodyColor: '#E2E8F0',
                    borderColor: 'rgba(0, 240, 255, 0.2)',
                    borderWidth: 1,
                    padding: 8,
                    callbacks: {
                        label: function (context) {
                            return ` ${context.label}: ${context.raw.toLocaleString()} kg`
                        }
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 800
            }
        }
    })
}

// Recalculate Dashboard statistics & update chart
function recalculateDashboard() {
    let totalVolume = 0
    let completedSetsCount = 0

    const muscleVolume = {
        chest: 0,
        back: 0,
        legs: 0,
        shoulders: 0,
        arms: 0
    }

    const exerciseBlocks = document.querySelectorAll('.exercise-block')

    exerciseBlocks.forEach(block => {
        const muscle = block.getAttribute('data-muscle')
        const setRows = block.querySelectorAll('.set-row')

        setRows.forEach(row => {
            const weightInput = row.querySelector('.weight-input')
            const repsInput = row.querySelector('.reps-input')
            const checkbox = row.querySelector('.set-checkbox')

            const weight = parseFloat(weightInput.value) || 0
            const reps = parseInt(repsInput.value) || 0
            const isCompleted = checkbox.checked

            if (isCompleted) {
                row.classList.add('active-row')
                completedSetsCount++
                const volume = weight * reps
                totalVolume += volume

                if (muscleVolume[muscle] !== undefined) {
                    muscleVolume[muscle] += volume
                }
            } else {
                row.classList.remove('active-row')
            }
        })
    })

    // Update global dashboard statistics
    document.getElementById('stat-volume').innerHTML =
        `${totalVolume.toLocaleString()} <span class="unit">kg</span>`
    document.getElementById('stat-sets').innerHTML =
        `${completedSetsCount} <span class="unit">組</span>`

    // Update chart datasets
    if (myChart) {
        myChart.data.datasets[0].data = [
            muscleVolume.chest,
            muscleVolume.back,
            muscleVolume.legs,
            muscleVolume.shoulders,
            muscleVolume.arms
        ]
        myChart.update()
    }

    renderCustomLegends(muscleVolume, totalVolume)
}

// Render dynamic legends below doughnut chart
function renderCustomLegends(muscleVolume, totalVolume) {
    const legendContainer = document.getElementById('chart-legend')
    if (!legendContainer) return

    const muscles = [
        { key: 'chest', label: '胸部', color: 'var(--color-blue)' },
        { key: 'back', label: '背部', color: 'var(--color-cyan)' },
        { key: 'legs', label: '腿部', color: 'var(--color-purple)' },
        { key: 'shoulders', label: '肩膀', color: 'var(--color-magenta)' },
        { key: 'arms', label: '手臂', color: 'var(--color-yellow)' }
    ]

    legendContainer.innerHTML = ''

    muscles.forEach(m => {
        const vol = muscleVolume[m.key]
        const pct = totalVolume > 0 ? Math.round((vol / totalVolume) * 100) : 0

        const legendItem = document.createElement('div')
        legendItem.className = 'legend-item'
        legendItem.innerHTML = `
            <span class="legend-dot" style="background-color: ${m.color}; box-shadow: 0 0 8px ${m.color}"></span>
            <span>${m.label}: <strong>${vol.toLocaleString()} kg</strong> (${pct}%)</span>
        `
        legendContainer.appendChild(legendItem)
    })
}

// Register interactive event listeners
function registerEventListeners() {
    const listContainer = document.getElementById('exercises-list')

    // 📲 Tactile Stepper Increment/Decrement Buttons using Event Delegation
    listContainer.addEventListener('click', e => {
        const stepBtn = e.target.closest('.btn-step')
        if (stepBtn) {
            const input = stepBtn.parentNode.querySelector('input')
            const isWeight = input.classList.contains('weight-input')
            const step = isWeight ? 2.5 : 1
            let val = parseFloat(input.value) || 0

            if (stepBtn.classList.contains('btn-plus')) {
                val += step
            } else if (stepBtn.classList.contains('btn-minus')) {
                val = Math.max(0, val - step)
            }

            input.value = val
            recalculateDashboard()
        }
    })

    // Checkbox State Change listener
    listContainer.addEventListener('change', e => {
        if (e.target.classList.contains('set-checkbox')) {
            recalculateDashboard()
            if (e.target.checked) {
                checkAllCompletedCelebration()
            }
        }
    })

    // Logger operations (Add set / Delete exercise)
    listContainer.addEventListener('click', e => {
        const addBtn = e.target.closest('.add-set-btn')
        if (addBtn) {
            const block = addBtn.closest('.exercise-block')
            addNewSetRow(block)
        }

        const deleteBtn = e.target.closest('.delete-exercise-btn')
        if (deleteBtn) {
            const block = deleteBtn.closest('.exercise-block')
            if (confirm('確定要移除此動作與所有組數紀錄嗎？')) {
                block.style.opacity = '0'
                block.style.transform = 'translateY(15px)'
                setTimeout(() => {
                    block.remove()
                    recalculateDashboard()
                }, 300)
            }
        }
    })

    // Search bar filter for Action Library
    const searchInput = document.getElementById('lib-search')
    searchInput.addEventListener('input', e => {
        const filter = e.target.value.toLowerCase()
        const items = document.querySelectorAll('.quick-lib-item')

        items.forEach(item => {
            const name = item.getAttribute('data-name').toLowerCase()
            const muscleZh = item.getAttribute('data-muscle-zh').toLowerCase()

            if (name.includes(filter) || muscleZh.includes(filter)) {
                item.style.display = 'flex'
            } else {
                item.style.display = 'none'
            }
        })
    })

    // Library additions
    const quickLibList = document.getElementById('quick-lib-list')
    quickLibList.addEventListener('click', e => {
        const quickAddBtn = e.target.closest('.btn-quick-add')
        if (quickAddBtn) {
            const item = quickAddBtn.closest('.quick-lib-item')
            const name = item.getAttribute('data-name')
            const muscle = item.getAttribute('data-muscle')

            createExerciseBlock(name, muscle)

            // Proactively switch view tab to log screen for mobile PWA ease of use
            const logTab = document.querySelector('.mobile-nav-item[data-target="page-logger"]')
            if (logTab) logTab.click()
        }
    })

    // Modal forms controls
    const quickLogBtn = document.getElementById('btn-quick-log')
    const modal = document.getElementById('add-exercise-modal')
    const modalClose = document.getElementById('modal-close')
    const modalCancel = document.getElementById('modal-cancel')
    const modalConfirm = document.getElementById('modal-confirm')

    quickLogBtn.addEventListener('click', () => {
        modal.classList.add('active')
        document.getElementById('modal-exercise-name').focus()
    })

    const closeModal = () => modal.classList.remove('active')
    modalClose.addEventListener('click', closeModal)
    modalCancel.addEventListener('click', closeModal)

    modalConfirm.addEventListener('click', () => {
        const nameInput = document.getElementById('modal-exercise-name')
        const selectedMuscle = document.querySelector('input[name="modal-muscle"]:checked').value
        const name = nameInput.value.trim() || '自訂動作'

        createExerciseBlock(name, selectedMuscle)
        nameInput.value = ''
        closeModal()

        // Switch to logger view
        const logTab = document.querySelector('.mobile-nav-item[data-target="page-logger"]')
        if (logTab) logTab.click()
    })
}

// Add dynamic new set row matching touch stepper layouts
function addNewSetRow(block) {
    const container = block.querySelector('.set-rows-container')
    const rows = container.querySelectorAll('.set-row')
    const newIdx = rows.length
    const prevRow = rows[rows.length - 1]

    const prevWeight = prevRow ? prevRow.querySelector('.weight-input').value : 40
    const prevReps = prevRow ? prevRow.querySelector('.reps-input').value : 10

    const newRow = document.createElement('div')
    newRow.className = 'set-row active-row'
    newRow.style.opacity = '0'
    newRow.style.transform = 'translateY(-10px)'
    newRow.style.transition = 'all 0.3s ease'
    newRow.setAttribute('data-set-index', newIdx)

    newRow.innerHTML = `
        <span class="set-num">${newIdx + 1}</span>
        <div class="stepper-input">
            <button class="btn-step btn-minus">-</button>
            <input type="number" class="weight-input" value="${prevWeight}" min="0" step="2.5" readonly>
            <button class="btn-step btn-plus">+</button>
        </div>
        <div class="stepper-input">
            <button class="btn-step btn-minus">-</button>
            <input type="number" class="reps-input" value="${prevReps}" min="0" readonly>
            <button class="btn-step btn-plus">+</button>
        </div>
        <label class="checkbox-container">
            <input type="checkbox" class="set-checkbox" checked>
            <span class="checkmark"></span>
        </label>
    `

    container.appendChild(newRow)

    setTimeout(() => {
        newRow.style.opacity = '1'
        newRow.style.transform = 'translateY(0)'
    }, 10)

    recalculateDashboard()
}

// Create customized exercise blocks on the fly
function createExerciseBlock(name, muscle) {
    const listContainer = document.getElementById('exercises-list')
    const blockId = `ex-${Date.now()}`

    const muscleMap = {
        chest: { name: '胸部 (Chest)', class: 'tag-chest' },
        back: { name: '背部 (Back)', class: 'tag-back' },
        legs: { name: '腿部 (Legs)', class: 'tag-legs' },
        shoulders: { name: '肩膀 (Shoulders)', class: 'tag-shoulders' },
        arms: { name: '手臂 (Arms)', class: 'tag-arms' }
    }

    const targetMuscleInfo = muscleMap[muscle] || { name: '全身 (Core)', class: 'tag-chest' }

    const block = document.createElement('div')
    block.className = 'exercise-block'
    block.style.opacity = '0'
    block.style.transform = 'translateY(20px)'
    block.style.transition = 'all 0.4s ease'
    block.setAttribute('data-exercise-id', blockId)
    block.setAttribute('data-muscle', muscle)

    block.innerHTML = `
        <div class="exercise-header">
            <div class="exercise-title-area">
                <div class="exercise-icon">
                    <i data-lucide="dumbbell"></i>
                </div>
                <div>
                    <h3 class="exercise-name">${name}</h3>
                    <span class="exercise-muscle-tag ${targetMuscleInfo.class}">${targetMuscleInfo.name}</span>
                </div>
            </div>
            <button class="btn-icon delete-exercise-btn" title="刪除動作">
                <i data-lucide="trash-2"></i>
            </button>
        </div>
        
        <div class="set-rows-container">
            <div class="set-header-row">
                <span class="col-num">組次</span>
                <span class="col-weight">重量 (kg)</span>
                <span class="col-reps">次數 (reps)</span>
                <span class="col-status">完成</span>
            </div>
            
            <div class="set-row active-row" data-set-index="0">
                <span class="set-num">1</span>
                <div class="stepper-input">
                    <button class="btn-step btn-minus">-</button>
                    <input type="number" class="weight-input" value="40" min="0" step="2.5" readonly>
                    <button class="btn-step btn-plus">+</button>
                </div>
                <div class="stepper-input">
                    <button class="btn-step btn-minus">-</button>
                    <input type="number" class="reps-input" value="10" min="0" readonly>
                    <button class="btn-step btn-plus">+</button>
                </div>
                <label class="checkbox-container">
                    <input type="checkbox" class="set-checkbox" checked>
                    <span class="checkmark"></span>
                </label>
            </div>
        </div>
        <button class="btn btn-secondary btn-sm add-set-btn">
            <i data-lucide="plus"></i> 新增組數
        </button>
    `

    listContainer.appendChild(block)

    lucide.createIcons()

    setTimeout(() => {
        block.style.opacity = '1'
        block.style.transform = 'translateY(0)'
    }, 50)

    recalculateDashboard()
}

// Celebration raining particles
function checkAllCompletedCelebration() {
    const checkboxes = document.querySelectorAll('.set-checkbox')
    const allChecked = Array.from(checkboxes).every(box => box.checked)

    if (allChecked && checkboxes.length > 0) {
        triggerConfettiRain()
    }
}

function triggerConfettiRain() {
    const container = document.getElementById('celebration-canvas')
    if (!container) return

    const colors = ['#00F0FF', '#2F80ED', '#9B5DE5', '#00FF87']
    const particleCount = 50

    for (let i = 0; i < particleCount; i++) {
        const p = document.createElement('div')
        p.className = 'particle'

        const size = Math.random() * 6 + 4
        const color = colors[Math.floor(Math.random() * colors.length)]

        p.style.width = `${size}px`
        p.style.height = `${size}px`
        p.style.backgroundColor = color
        p.style.boxShadow = `0 0 8px ${color}`
        p.style.left = `${Math.random() * 100}vw`

        const duration = Math.random() * 1.5 + 1.2
        p.style.animationDuration = `${duration}s`
        p.style.animationDelay = `${Math.random() * 0.4}s`

        container.appendChild(p)

        setTimeout(
            () => {
                p.remove()
            },
            (duration + 0.5) * 1000
        )
    }
}

// 7. PWA Service Worker Registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker
                .register('sw.js')
                .then(reg => {
                    console.log(
                        'ForgeFit PWA Service Worker registered successfully, scope:',
                        reg.scope
                    )
                })
                .catch(err => {
                    console.error('ForgeFit Service Worker registration failed:', err)
                })
        })
    }
}
