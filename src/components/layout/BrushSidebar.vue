<script setup>
import { computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import ColorPicker from '@/components/common/ColorPicker.vue'

const store = useCanvasStore()

const presets = [
  { name: 'Pincel Duro', settings: { size: 20, hardness: 1, opacity: 1 } },
  { name: 'Pincel Suave', settings: { size: 40, hardness: 0.2, opacity: 1 } },
  { name: 'Aerógrafo', settings: { size: 60, hardness: 0.1, opacity: 0.5 } },
  { name: 'Caneta Tinteiro', settings: { size: 5, hardness: 0.9, opacity: 1 } },
]

const palette = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#808080', '#ff8c00'
]

const isEraserActive = computed(() => store.activeTool === 'eraser')

function applyPreset(preset) {
  store.setBrushOption('size', preset.settings.size)
  store.setBrushOption('hardness', preset.settings.hardness)
  store.setBrushOption('opacity', preset.settings.opacity)
}

function updateColor(color) {
  store.setPrimaryColor(color.hex)
}
</script>

<template>
  <aside class="brush-sidebar">
    <div v-if="!isEraserActive" class="sidebar-section tools">
      <button :class="{ active: store.paintTool === 'brush' }" @click="store.setPaintTool('brush')" title="Pincel">
        <svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
      </button>
      <button :class="{ active: store.paintTool === 'bucket' }" @click="store.setPaintTool('bucket')" title="Balde de Tinta">
         <svg viewBox="0 0 24 24"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" /><path d="m5 2 5 5" /><path d="M22 9-8.5 20.5" /><path d="m16 14 3-3" /></svg>
      </button>
      <button :class="{ active: store.paintTool === 'eyedropper' }" @click="store.setPaintTool('eyedropper')" title="Conta-gotas">
        <svg viewBox="0 0 24 24"><path d="m13 2-9 9 4 4 9-9-4-4Z" /><path d="m4 13 8 8" /></svg>
      </button>
    </div>

    <div class="sidebar-section settings">
      <div v-if="isEraserActive">
        <div class="control-group">
            <label>Tamanho: {{ store.eraser.size.toFixed(0) }} px</label>
            <input type="range" min="1" max="500" v-model.number="store.eraser.size" @input="store.setEraserOption('size', parseFloat($event.target.value))"/>
        </div>
        <div class="control-group">
            <label>Intensidade: {{ (store.eraser.opacity * 100).toFixed(0) }}%</label>
            <input type="range" min="0" max="1" step="0.01" v-model.number="store.eraser.opacity" @input="store.setEraserOption('opacity', parseFloat($event.target.value))"/>
        </div>
      </div>
      <div v-else>
        <div class="control-group">
            <label>Tamanho: {{ store.brush.size.toFixed(0) }} px</label>
            <input type="range" min="1" max="500" v-model.number="store.brush.size" @input="store.setBrushOption('size', parseFloat($event.target.value))"/>
        </div>
         <div class="control-group">
            <label>Dureza: {{ (store.brush.hardness * 100).toFixed(0) }}%</label>
            <input type="range" min="0" max="1" step="0.01" v-model.number="store.brush.hardness" @input="store.setBrushOption('hardness', parseFloat($event.target.value))"/>
        </div>
        <div class="control-group">
            <label>Opacidade: {{ (store.brush.opacity * 100).toFixed(0) }}%</label>
            <input type="range" min="0" max="1" step="0.01" v-model.number="store.brush.opacity" @input="store.setBrushOption('opacity', parseFloat($event.target.value))"/>
        </div>
      </div>
    </div>

    <div v-if="!isEraserActive" class="sidebar-section presets">
        <h4>Pré-definições</h4>
        <div class="preset-grid">
            <button v-for="p in presets" :key="p.name" @click="applyPreset(p)" :title="p.name" class="preset-btn">
                {{ p.name }}
            </button>
        </div>
    </div>

    <div v-if="!isEraserActive" class="sidebar-section colors">
      <h4>Paleta</h4>
      <div class="palette-grid">
        <div v-for="color in palette" :key="color" class="color-swatch" :style="{ backgroundColor: color }" @click="store.setPrimaryColor(color)"></div>
      </div>
       <ColorPicker @update:color="updateColor" />
    </div>

  </aside>
</template>

<style scoped>
.brush-sidebar {
  width: 280px;
  background-color: var(--c-surface);
  border-right: 1px solid var(--c-border);
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-5);
  overflow-y: auto;
  z-index: 205;
}
.sidebar-section h4 {
  font-size: var(--fs-sm);
  font-weight: var(--fw-bold);
  color: var(--c-text-secondary);
  margin-bottom: var(--spacing-3);
  text-transform: uppercase;
}
.sidebar-section.tools {
    display: flex;
    justify-content: space-around;
    background: var(--c-surface-dark);
    border-radius: var(--radius-md);
    padding: var(--spacing-2);
}
.tools button {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
}
.tools button svg {
    width: 20px;
    height: 20px;
    stroke-width: 2;
    fill: none;
    stroke: var(--c-text-secondary);
}
.tools button:hover {
    background: var(--c-border);
}
.tools button.active {
    background-color: var(--c-primary);
}
.tools button.active svg {
    stroke: var(--c-white);
}

.control-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-3);
}
.control-group label {
    font-size: var(--fs-sm);
    color: var(--c-text-secondary);
}
input[type="range"] {
    width: 100%;
}
.preset-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-2);
}
.preset-btn {
    padding: var(--spacing-2);
    border: 1px solid var(--c-border);
    border-radius: var(--radius-md);
    text-align: center;
}
.palette-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(32px, 1fr));
    gap: var(--spacing-2);
    margin-bottom: var(--spacing-4);
}
.color-swatch {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid var(--c-border);
}
.color-swatch:hover {
    transform: scale(1.1);
}
</style>
