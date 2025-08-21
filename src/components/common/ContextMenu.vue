<script setup>
import { computed, ref } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useImageAdjustmentsStore } from '@/stores/imageAdjustmentsStore'
import { useLayerHistoryStore } from '@/stores/layerHistoryStore'

const store = useCanvasStore()
const adjustmentsStore = useImageAdjustmentsStore()
const layerHistoryStore = useLayerHistoryStore()

const showZoomSlider = ref(false)

const targetLayerId = computed(() => store.workspace.contextMenuTargetLayerId);
const targetLayer = computed(() => store.layers.find(l => l.id === targetLayerId.value));

const canMergeDown = computed(() => {
    if (!targetLayerId.value) return false;
    const index = store.layers.findIndex(l => l.id === targetLayerId.value);
    return index > 0;
});

const canUndo = computed(() => {
  if (!targetLayerId.value) return false
  return layerHistoryStore.canUndo(targetLayerId.value)
})

const canRedo = computed(() => {
  if (!targetLayerId.value) return false
  return layerHistoryStore.canRedo(targetLayerId.value)
})

const zoomLevel = computed({
  get: () => store.workspace.zoom * 100,
  set: (val) => {
    const canvasEl = document.getElementById('mainCanvas')
    if (!canvasEl) return
    const center = { x: canvasEl.clientWidth / 2, y: canvasEl.clientHeight / 2 }
    const newZoom = val / 100
    const { pan, zoom } = store.workspace
    const worldX = (center.x - pan.x) / zoom
    const worldY = (center.y - pan.y) / zoom
    const newPanX = center.x - worldX * newZoom
    const newPanY = center.y - worldY * newZoom
    store.updateWorkspace({ zoom: newZoom, pan: { x: newPanX, y: newPanY } })
  },
})

function onClick(action) {
  if(action) action();
  if (!showZoomSlider.value) {
    store.showContextMenu(false);
  }
}
</script>

<template>
  <div
    class="context-menu-overlay"
    @click.self="onClick()"
    @contextmenu.prevent.self="onClick()"
  >
    <div
        class="context-menu"
        :style="{
        top: `${store.workspace.contextMenuPosition.y}px`,
        left: `${store.workspace.contextMenuPosition.x}px`,
        }"
    >
        <div v-if="showZoomSlider" class="menu-section">
            <div class="zoom-slider-container">
                <span class="icon">🔍</span>
                <input type="range" min="2" max="1000" v-model="zoomLevel" class="zoom-slider" />
                <span>{{ zoomLevel.toFixed(0) }}%</span>
                <button @click="showZoomSlider = false" class="close-zoom-btn">OK</button>
            </div>
        </div>
        <template v-else>
            <div class="menu-section">
                <div class="menu-item" @click="showZoomSlider = true">
                    <span class="icon">➕</span>
                    <span class="text">Aproximar/Afastar Zoom</span>
                    <span class="shortcut">Ctrl +/-</span>
                </div>
                <div class="menu-item" @click="onClick(() => store.zoomToFit())">
                    <span class="icon">🎯</span>
                    <span class="text">Ajustar à Tela</span>
                    <span class="shortcut">Ctrl 0</span>
                </div>
            </div>

            <template v-if="targetLayer">
                <div class="menu-divider"></div>
                <div class="menu-section">
                     <div class="menu-item history-controls">
                        <button :disabled="!canUndo" @click="onClick(() => layerHistoryStore.undo(targetLayerId))" title="Desfazer">
                            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" /></svg>
                        </button>
                         <span class="text">Histórico da Camada</span>
                        <button :disabled="!canRedo" @click="onClick(() => layerHistoryStore.redo(targetLayerId))" title="Refazer">
                            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
                        </button>
                    </div>
                    <div class="menu-item" @click="onClick(() => store.togglePanel('layerHistory', true, targetLayerId))">
                        <span class="icon">📜</span>
                        <span class="text">Ver Histórico Detalhado...</span>
                    </div>
                </div>
                <div class="menu-divider"></div>
                <div class="menu-section">
                    <div class="menu-item" @click="onClick(() => store.duplicateLayer(targetLayerId))">
                        <span class="icon">📋</span>
                        <span class="text">Duplicar Camada</span>
                    </div>
                    <div class="menu-item" :class="{ disabled: !canMergeDown }" @click="canMergeDown && onClick(() => store.mergeDown(targetLayerId))">
                        <span class="icon">📥</span>
                        <span class="text">Mesclar para Baixo</span>
                    </div>
                </div>
                <div class="menu-divider"></div>
                <div class="menu-section">
                    <div class="menu-item" @click="onClick(() => adjustmentsStore.openModal())">
                        <span class="icon">🎨</span>
                        <span class="text">Ajustes de Imagem...</span>
                    </div>
                    <div class="menu-item" @click="onClick(() => store.showResizeModal(true))">
                        <span class="icon">📏</span>
                        <span class="text">Redimensionar</span>
                    </div>
                </div>
                <div class="menu-divider"></div>
                <div class="menu-section">
                    <div class="menu-item" @click="onClick(() => store.flipLayer('horizontal'))">
                        <span class="icon">↔️</span>
                        <span class="text">Inverter Horizontalmente</span>
                    </div>
                    <div class="menu-item" @click="onClick(() => store.flipLayer('vertical'))">
                        <span class="icon">↕️</span>
                        <span class="text">Inverter Verticalmente</span>
                    </div>
                </div>
                <div class="menu-divider"></div>
                <div class="menu-section">
                    <div class="menu-item" @click="onClick(() => store.exportLayer(targetLayerId, 'png'))">
                        <span class="icon">🖼️</span>
                        <span class="text">Exportar como PNG</span>
                    </div>
                    <div class="menu-item" @click="onClick(() => store.exportLayer(targetLayerId, 'jpeg'))">
                        <span class="icon">🖼️</span>
                        <span class="text">Exportar como JPG</span>
                    </div>
                </div>
                <div class="menu-divider"></div>
                <div class="menu-section">
                    <div class="menu-item danger" @click="onClick(() => store.deleteLayer(targetLayerId))">
                        <span class="icon">🗑️</span>
                        <span class="text">Apagar Camada</span>
                    </div>
                </div>
            </template>
        </template>
    </div>
  </div>
</template>

<style scoped>
/* Seus estilos existentes ... */
.context-menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 999;
}
.context-menu {
  position: fixed;
  background-color: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  padding: var(--spacing-2);
  width: 260px;
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.8);
}
.menu-section {
    display: flex;
    flex-direction: column;
}
.menu-item {
    display: grid;
    grid-template-columns: 24px 1fr auto;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-2) var(--spacing-3);
    cursor: pointer;
    font-size: var(--fs-sm);
    white-space: nowrap;
    border-radius: var(--radius-md);
    transition: background-color 0.1s ease-in-out;
}
.menu-item:hover {
  background-color: var(--c-primary);
  color: var(--c-white);
}
.menu-item:hover .shortcut {
    color: rgba(255, 255, 255, 0.7);
}
.menu-item .icon {
    font-size: 16px;
    text-align: center;
}
.menu-item .text {
    font-weight: var(--fw-medium);
}
.menu-item .shortcut {
    font-size: var(--fs-xs);
    color: var(--c-text-tertiary);
    justify-self: end;
}
.menu-item.disabled {
  color: var(--c-text-tertiary);
  cursor: not-allowed;
  background-color: transparent !important;
}
.menu-divider {
  height: 1px;
  background: var(--c-border);
  margin: var(--spacing-2);
}
.menu-item.danger {
  color: #ff3333;
}
.menu-item.danger:hover {
  background-color: #ff3333;
  color: white;
}
.zoom-slider-container {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
}
.zoom-slider {
    flex-grow: 1;
    accent-color: var(--c-primary);
}
.zoom-slider-container span {
    font-size: var(--fs-xs);
    font-family: monospace;
    width: 40px;
    text-align: right;
}
.close-zoom-btn {
    font-size: var(--fs-xs);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    background-color: var(--c-surface-dark);
}
.history-controls {
    grid-template-columns: auto 1fr auto;
    padding: 4px;
}
.history-controls .text {
    text-align: center;
}
.history-controls button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
}
.history-controls button:hover:not(:disabled) {
    background-color: rgba(0,0,0,0.1);
}
.history-controls button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}
.history-controls button svg {
    stroke: currentColor;
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
}
</style>
