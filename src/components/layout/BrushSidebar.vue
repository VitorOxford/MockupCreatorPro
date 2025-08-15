<script setup>
import { computed, ref } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import BrushPreview from '@/components/common/BrushPreview.vue'
import ColorWheelPicker from '@/components/common/ColorWheelPicker.vue'
import { draggable } from '@/directives/draggable.js' // <-- IMPORTA A NOVA DIRECTIVE

const store = useCanvasStore()
const showColorPicker = ref(false)

const presets = [
  { name: 'Pincel Duro', settings: { size: 5, hardness: 0.95 } },
  { name: 'Pincel Suave', settings: { size: 40, hardness: 0.2 } },
  { name: 'Aerógrafo', settings: { size: 80, hardness: 0.1 } },
  { name: 'Marcador', settings: { size: 15, hardness: 1.0 } },
]

const palette = [
  '#000000', '#4c4c4c', '#999999', '#ffffff',
  '#990000', '#ff0000', '#ff9900', '#ffff00',
  '#009900', '#00ff00', '#00ffff', '#0000ff',
  '#9900ff', '#ff00ff', '#ffccff', '#cc66ff'
]

const activeTool = computed(() => store.activeTool)

function applyPreset(preset) {
  store.setBrushOption('size', preset.settings.size)
  store.setBrushOption('hardness', preset.settings.hardness)
}
</script>

<template>
  <div v-if="store.workspace.isBrushSidebarVisible">
    <aside
      class="tool-options-panel"
      v-draggable
    >
        <header class="panel-header draggable-handle">
            <h5 class="panel-title">Opções da Ferramenta</h5>
            <div class="panel-actions">
                <button
                  class="pin-btn"
                  :class="{ 'is-pinned': store.workspace.isBrushSidebarPinned }"
                  @click="store.togglePinBrushSidebar"
                  title="Fixar painel"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5M10 17h4M16 4.5l-4-4-4 4M16 4.5V12a4 4 0 0 1-4 4h0a4 4 0 0 1-4-4V4.5"/></svg>
                </button>
                <button class="close-btn" @click="store.toggleBrushSidebar(false)">&times;</button>
            </div>
        </header>

        <div class="panel-content">
            <div v-if="activeTool === 'brush' || activeTool === 'bucket'" class="panel-section">
                <div class="color-selection-header">
                <div
                    class="color-swatch"
                    :style="{ backgroundColor: store.primaryColor }"
                    @click="showColorPicker = !showColorPicker"
                ></div>
                <div class="color-info">
                    <h5 class="section-title">Cor</h5>
                    <span>{{ store.primaryColor }}</span>
                </div>
                <button class="icon-button" @click="store.setActiveTool('eyedropper')" title="Conta-gotas (I)">
                    <svg viewBox="0 0 24 24"><path d="m13 2-9 9 4 4 9-9-4-4Z" /><path d="m4 13 8 8" /></svg>
                </button>
                </div>
                <div class="palette-grid">
                <div
                    v-for="color in palette"
                    :key="color"
                    class="palette-swatch"
                    :style="{ backgroundColor: color }"
                    @click="store.setPrimaryColor(color)"
                ></div>
                </div>
            </div>

            <div class="divider" v-if="activeTool === 'brush' || activeTool === 'bucket'"></div>

            <div class="panel-section">
                <div v-if="activeTool === 'magic-wand'">
                <h5 class="section-title">Opções da Varinha Mágica</h5>
                <div class="control-group">
                    <label>Tolerância: {{ store.workspace.magicWand.tolerance }}</label>
                    <input type="range" min="0" max="255" v-model.number="store.workspace.magicWand.tolerance" class="slider" />
                </div>
                <div class="control-group checkbox-group">
                    <input type="checkbox" id="contiguous-check" v-model="store.workspace.magicWand.contiguous" />
                    <label for="contiguous-check">Contíguo</label>
                </div>
                </div>

                <div v-else-if="activeTool === 'eraser'">
                <h5 class="section-title">Opções da Borracha</h5>
                <div class="control-group">
                    <label>Tamanho: {{ store.eraser.size.toFixed(0) }} px</label>
                    <input type="range" min="1" max="500" v-model.number="store.eraser.size" @input="store.setEraserOption('size', parseFloat($event.target.value))" class="slider"/>
                </div>
                <div class="control-group">
                    <label>Intensidade: {{ (store.eraser.opacity * 100).toFixed(0) }}%</label>
                    <input type="range" min="0" max="1" step="0.01" v-model.number="store.eraser.opacity" @input="store.setEraserOption('opacity', parseFloat($event.target.value))" class="slider"/>
                </div>
                </div>

                <div v-else-if="activeTool === 'brush' || activeTool === 'bucket'">
                <h5 class="section-title">Opções do Pincel</h5>
                <div class="control-group">
                    <label>Tamanho: {{ store.brush.size.toFixed(0) }} px</label>
                    <input type="range" min="1" max="500" v-model.number="store.brush.size" @input="store.setBrushOption('size', parseFloat($event.target.value))" class="slider"/>
                </div>
                <div class="control-group">
                    <label>Dureza: {{ (store.brush.hardness * 100).toFixed(0) }}%</label>
                    <input type="range" min="0" max="1" step="0.01" v-model.number="store.brush.hardness" @input="store.setBrushOption('hardness', parseFloat($event.target.value))" class="slider"/>
                </div>
                </div>
            </div>

            <div v-if="activeTool === 'brush'" class="panel-section presets">
                <div class="divider"></div>
                <h5 class="section-title">Pré-definições de Pincel</h5>
                <div class="preset-list">
                    <div v-for="p in presets" :key="p.name" @click="applyPreset(p)" :title="p.name" class="preset-item">
                        <BrushPreview :size="p.settings.size" :hardness="p.settings.hardness" />
                        <span class="preset-name">{{ p.name }}</span>
                    </div>
                </div>
            </div>
        </div>
    </aside>
    <ColorWheelPicker v-if="showColorPicker" @close="showColorPicker = false" />
  </div>
</template>

<style scoped>
.tool-options-panel {
  position: absolute;
  top: 80px;
  left: calc(var(--sidebar-width) + 12px);
  width: 280px;
  min-height: 200px;
  background-color: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 205;
  display: flex;
  flex-direction: column;
  resize: both;
  overflow: hidden;
}
.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-2) var(--spacing-3);
    border-bottom: 1px solid var(--c-border);
    background-color: var(--c-surface-dark);
    flex-shrink: 0;
}
.panel-title {
    font-weight: var(--fw-semibold);
    color: var(--c-text-primary);
    margin: 0;
}
.panel-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
}
.pin-btn, .close-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--c-text-secondary);
    border-radius: var(--radius-sm);
}
.pin-btn:hover, .close-btn:hover {
    background-color: var(--c-border);
}
.pin-btn.is-pinned {
    color: var(--c-white);
    background-color: var(--c-primary);
}
.close-btn {
    font-size: 1.5rem;
    line-height: 1;
}
.panel-content {
    padding: var(--spacing-4);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    overflow-y: auto;
    flex-grow: 1;
}
.panel-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}
.divider {
  height: 1px;
  background-color: var(--c-border);
  margin: calc(var(--spacing-2) * -1) 0;
}
.section-title {
  font-size: var(--fs-xs);
  font-weight: var(--fw-bold);
  color: var(--c-text-secondary);
  text-transform: uppercase;
  margin: 0;
}
.control-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
.control-group label {
  font-size: var(--fs-sm);
  color: var(--c-text-primary);
  font-weight: var(--fw-medium);
}
.checkbox-group {
    flex-direction: row;
    align-items: center;
    gap: var(--spacing-2);
}
.checkbox-group label {
    margin-bottom: 0;
    cursor: pointer;
}
.slider {
  width: 100%;
  accent-color: var(--c-primary);
}
.color-selection-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}
.color-swatch {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 4px solid var(--c-white);
  box-shadow: var(--shadow-md);
  cursor: pointer;
  flex-shrink: 0;
}
.color-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  flex-grow: 1;
}
.color-info span {
  font-family: monospace;
  font-weight: var(--fw-semibold);
}
.icon-button {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--c-border);
  background-color: var(--c-white);
  flex-shrink: 0;
}
.icon-button:hover {
  background-color: var(--c-surface-dark);
  color: var(--c-primary);
}
.icon-button svg {
  width: 18px;
  height: 18px;
  stroke-width: 2;
  fill: none;
  stroke: currentColor;
}
.palette-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(24px, 1fr));
  gap: var(--spacing-2);
}
.palette-swatch {
  width: 100%;
  aspect-ratio: 1/1;
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 1px solid var(--c-border);
}
.palette-swatch:hover {
  transform: scale(1.1);
  box-shadow: 0 0 0 2px var(--c-primary);
}
.preset-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  max-height: 180px;
  overflow-y: auto;
  padding-right: var(--spacing-2);
}
.preset-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-2);
  border-radius: var(--radius-md);
  cursor: pointer;
}
.preset-item:hover {
  background-color: var(--c-surface-dark);
}
.preset-item > div:first-child {
  flex-basis: 60px;
  flex-shrink: 0;
}
.preset-name {
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
}
</style>
