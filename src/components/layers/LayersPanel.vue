<script setup>
import { computed, ref } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import AssetsSidebar from '@/components/layout/AssetsSidebar.vue'

const store = useCanvasStore()
const isAssetsPanelVisible = ref(false)
const draggedLayerIndex = ref(null)

const reversedLayers = computed(() => [...store.layers].reverse())

function toggleVisibility(layer) {
  store.updateLayerProperties(layer.id, { visible: !layer.visible }, 'Visibilidade')
}

const selectedLayerOpacity = computed({
  get() {
    return store.selectedLayer ? store.selectedLayer.opacity * 100 : 100
  },
  set(value) {
    if (store.selectedLayer) {
      store.updateLayerProperties(store.selectedLayer.id, { opacity: value / 100 }, 'Opacidade')
    }
  },
})

function getOriginalIndex(reversedIndex) {
  return store.layers.length - 1 - reversedIndex
}

function handleDragStart(event, reversedIndex) {
  draggedLayerIndex.value = getOriginalIndex(reversedIndex)
  event.dataTransfer.effectAllowed = 'move'
}

function handleDragOver(event) {
  event.preventDefault()
}

function handleDrop(event, reversedIndex) {
  event.preventDefault()
  const fromIndex = draggedLayerIndex.value
  const toIndex = getOriginalIndex(reversedIndex)

  if (fromIndex !== null && fromIndex !== toIndex) {
    store.moveLayer(fromIndex, toIndex)
  }
  draggedLayerIndex.value = null
}

function handleContextMenu(event, layerId) {
  event.preventDefault();
  store.showContextMenu(true, { x: event.clientX, y: event.clientY }, layerId)
}
</script>

<template>
  <aside class="layers-panel">
    <div class="panel-header">
      <h4>Camadas</h4>
       <div class="header-actions">
        <button @click="store.togglePanel('globalHistory', true)" title="Histórico Global">📜</button>
        <button
            @click="isAssetsPanelVisible = !isAssetsPanelVisible"
            class="btn btn-primary add-layer-btn"
        >
            + Adicionar
        </button>
      </div>
    </div>
    <div class="layers-list">
      <div v-if="store.layers.length === 0" class="empty-state">
        <p>Sem camadas.</p>
        <span>Adicione um ativo para começar.</span>
      </div>

      <div
        v-for="(layer, index) in reversedLayers"
        :key="layer.id"
        class="layer-item-wrapper"
        :draggable="true"
        @dragstart="handleDragStart($event, index)"
        @dragover="handleDragOver($event)"
        @drop="handleDrop($event, index)"
      >
        <div
          class="layer-item"
          :class="{ active: store.selectedLayerId === layer.id }"
          @click="store.selectLayer(layer.id)"
          @contextmenu="handleContextMenu($event, layer.id)"
        >
          <div class="layer-thumbnail">
            <img v-if="layer.imageUrl" :src="layer.imageUrl" :alt="layer.name" />
          </div>
          <span class="layer-name">{{ layer.name }}</span>

          <div class="layer-actions">
            <button
              @click.stop="toggleVisibility(layer)" title="Mostrar/Ocultar Camada">
              <svg v-if="layer.visible" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else viewBox="0 0 24 24">
                <path
                  d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07l-2.22-2.22"
                />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </button>
            <button @click.stop="handleContextMenu($event, layer.id)" title="Mais Opções">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
            </button>
          </div>
        </div>

        <div v-if="store.selectedLayerId === layer.id" class="opacity-panel">
          <label>Opacidade</label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            v-model="selectedLayerOpacity"
            class="opacity-slider"
          />
          <span>{{ selectedLayerOpacity }}%</span>
        </div>
      </div>
    </div>
  </aside>

  <AssetsSidebar :is-visible="isAssetsPanelVisible" @close="isAssetsPanelVisible = false" />
</template>

<style scoped>
.layers-panel {
  grid-area: layers;
  background-color: var(--c-surface);
  border-left: 1px solid var(--c-border);
  display: flex;
  flex-direction: column;
  height: 100%;
  z-index: 200;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-3) var(--spacing-4);
  border-bottom: 1px solid var(--c-border);
  flex-shrink: 0;
}
.panel-header h4 {
  font-size: var(--fs-base);
  font-weight: var(--fw-semibold);
  margin: 0;
}
.header-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
}
.header-actions button {
    background: none;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    padding: var(--spacing-1);
    font-size: 1.2rem;
    cursor: pointer;
}
.header-actions button:hover {
    background-color: var(--c-surface-dark);
    border-color: var(--c-border);
}
.add-layer-btn {
  padding: var(--spacing-1) var(--spacing-3);
  font-size: var(--fs-sm);
  border: none !important;
}
.layers-list {
  flex-grow: 1;
  overflow-y: auto;
  padding: var(--spacing-2);
}
.layer-item-wrapper {
  margin-bottom: var(--spacing-1);
}
.layer-item-wrapper[draggable='true'] {
  cursor: grab;
}
.layer-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-2);
  border-radius: var(--radius-md);
  transition: background-color 0.15s ease-in-out;
  position: relative;
}
.layer-thumbnail {
  width: 40px;
  height: 40px;
  background-color: var(--c-background);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  overflow: hidden;
}
.layer-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.layer-name {
  flex-grow: 1;
  font-weight: var(--fw-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: var(--transition-fast);
}
.layer-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  background-color: var(--c-surface-dark);
  border-radius: var(--radius-md);
  padding: 2px;
  position: absolute;
  right: var(--spacing-2);
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  pointer-events: none;
  transition: var(--transition-fast);
}
.layer-item:hover .layer-actions,
.layer-item.active .layer-actions {
  opacity: 1;
  pointer-events: auto;
}
.layer-item:hover .layer-name,
.layer-item.active .layer-name {
  max-width: 120px;
}
.layer-actions button {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text-secondary);
  border-radius: var(--radius-sm);
}
.layer-actions button:hover:not(:disabled) {
  background-color: var(--c-border);
  color: var(--c-text-primary);
}
.layer-actions button:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}
.layer-actions button svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.layer-item.active {
  background-color: var(--c-primary);
  color: var(--c-white);
}
.layer-item.active .layer-actions {
  background-color: rgba(255, 255, 255, 0.2);
}
.layer-item.active .layer-actions button {
  color: var(--c-white);
}
.layer-item.active .layer-actions button:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.3);
}
.opacity-panel {
  background-color: var(--c-surface-dark);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-top: -4px;
}
.opacity-panel label {
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
  color: var(--c-text-secondary);
}
.opacity-slider {
  flex-grow: 1;
  accent-color: var(--c-primary);
}
.opacity-panel span {
  font-size: var(--fs-sm);
  font-family: monospace;
  color: var(--c-text-primary);
  width: 40px;
  text-align: right;
}
.empty-state {
  text-align: center;
  padding: var(--spacing-6);
  color: var(--c-text-secondary);
}
.empty-state span {
  font-size: var(--fs-xs);
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-md);
  font-weight: var(--fw-semibold);
  transition: var(--transition-fast);
  border: none;
  cursor: pointer;
}
.btn-primary {
  background-color: var(--c-primary);
  color: var(--c-white);
}
.btn-primary:hover {
  background-color: var(--c-primary-hover);
}
</style>
