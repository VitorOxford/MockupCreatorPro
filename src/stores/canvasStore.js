// src/stores/canvasStore.js
import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { supabase } from '@/supabase'
import { v4 as uuidv4 } from 'uuid'
import { useImageAdjustmentsStore } from './imageAdjustmentsStore'

const MAX_RENDER_SIZE = 4096

export const useCanvasStore = defineStore('canvas', () => {
  const layers = ref([])
  const selectedLayerId = ref(null)
  const activeTool = ref('move')
  const paintTool = ref('brush') // 'brush', 'eraser', 'bucket', 'eyedropper'
  const primaryColor = ref('#000000')

  const brush = reactive({
    size: 20,
    opacity: 1,
    hardness: 0.9,
  })

  // NOVO: Estado para a borracha
  const eraser = reactive({
    size: 40,
    opacity: 1, // Intensidade
  })

  const copiedSelection = ref(null)

  const workspace = reactive({
    pan: { x: 0, y: 0 },
    zoom: 1,
    viewMode: 'edit',
    document: { width: 1920, height: 1080 },
    rulers: { visible: true, unit: 'cm' },
    grid: { visible: true },
    previewIsInteractive: false,
    previewZoom: 1,
    previewRenderScale: 1,
    lasso: {
      active: false,
      points: [],
      boundingBox: { x: 0, y: 0, width: 0, height: 0 },
    },
    selection: {
      active: false,
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      width: 0,
      height: 0,
      dimPxW: 0,
      dimPxH: 0,
      dimCmW: 0,
      dimCmH: 0,
    },
    transformStart: {
      scale: 1,
      rotation: 0,
      layerRotation: 0,
      mousePos: { x: 0, y: 0 },
      layerCenter: { x: 0, y: 0 },
    },
    isContextMenuVisible: false,
    contextMenuPosition: { x: 0, y: 0 },
    contextMenuTargetLayerId: null,
    isSelectionContextMenuVisible: false,
    selectionContextMenuPosition: { x: 0, y: 0 },
    isResizeModalVisible: false,
    isPreviewSidebarVisible: false,
    isSignatureModalVisible: false,
    isBrushSidebarVisible: false,
  })

  const selectedLayer = computed(() => layers.value.find((l) => l.id === selectedLayerId.value))
  const mockupLayer = computed(() => layers.value.find((l) => l.type === 'mockup' && l.visible))
  const isSelectionActive = computed(
    () => workspace.lasso.points.length > 2 || workspace.selection.width > 0,
  )

  const rulerSource = computed(() => {
    const layer = selectedLayer.value || mockupLayer.value
    if (layer && layer.metadata.originalWidth) {
      const width = layer.metadata.originalWidth * layer.scale
      const height = layer.metadata.originalHeight * layer.scale
      return {
        width,
        height,
        dpi: layer.metadata.dpi || 96,
        x: layer.x - width / 2,
        y: layer.y - height / 2,
      }
    }
    return {
      width: workspace.document.width,
      height: workspace.document.height,
      dpi: 96,
      x: 0,
      y: 0,
    }
  })

  function createLayerObject(name, type, url, metadata = {}) {
    return reactive({
      id: uuidv4(),
      name,
      type,
      visible: true,
      opacity: 1,
      image: null,
      fullResImage: null,
      imageUrl: url,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      metadata: { ...metadata, dpi: metadata?.dpi || 96, originalWidth: 0, originalHeight: 0 },
      originalFile: null,
      adjustments: {
        grayscale: 0,
        sepia: 0,
        saturate: 100,
        contrast: 100,
        brightness: 100,
        invert: 0,
        flipH: false,
        flipV: false,
      },
      version: 1,
    })
  }

  function processAndAddLayer(newLayerData) {
    const { name, type, imageUrl, metadata, initialPosition, file } = newLayerData
    const newLayer = createLayerObject(name, type, imageUrl, metadata)

    if (file) {
      newLayer.originalFile = file
    }

    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = imageUrl
    img.onload = () => {
      const imageWidth = metadata.originalWidth || img.naturalWidth
      const imageHeight = metadata.originalHeight || img.naturalHeight

      const renderCanvas = document.createElement('canvas')
      renderCanvas.width = imageWidth
      renderCanvas.height = imageHeight
      renderCanvas.getContext('2d').drawImage(img, 0, 0)

      if (imageWidth > MAX_RENDER_SIZE || imageHeight > MAX_RENDER_SIZE) {
        const ratio = Math.min(MAX_RENDER_SIZE / imageWidth, MAX_RENDER_SIZE / imageHeight)
        const proxyCanvas = document.createElement('canvas')
        proxyCanvas.width = imageWidth * ratio
        proxyCanvas.height = imageHeight * ratio
        proxyCanvas.getContext('2d').drawImage(img, 0, 0, proxyCanvas.width, proxyCanvas.height)
        newLayer.image = proxyCanvas
        newLayer.fullResImage = renderCanvas
      } else {
        newLayer.image = renderCanvas
        newLayer.fullResImage = renderCanvas
      }

      newLayer.metadata.originalWidth = imageWidth
      newLayer.metadata.originalHeight = imageHeight

      if (type === 'mockup' && !initialPosition) {
        workspace.document.width = imageWidth
        workspace.document.height = imageHeight
      }

      newLayer.x = initialPosition ? initialPosition.x : workspace.document.width / 2
      newLayer.y = initialPosition ? initialPosition.y : workspace.document.height / 2

      layers.value.push(newLayer)
      selectLayer(newLayer.id)
      if (!initialPosition) {
        frameLayer(newLayer.id)
      }
    }
  }

  function applyPaintToLayer(points) {
    if (!selectedLayer.value || !selectedLayer.value.image) return
    const layer = selectedLayer.value
    const ctx = layer.image.getContext('2d')

    ctx.save()
    ctx.globalAlpha = brush.opacity
    ctx.strokeStyle = primaryColor.value
    ctx.lineWidth = brush.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.fillStyle = primaryColor.value

    ctx.beginPath();
    if (points.length > 1) {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const midPoint = { x: (points[i-1].x + points[i].x) / 2, y: (points[i-1].y + points[i].y) / 2 };
        ctx.quadraticCurveTo(points[i-1].x, points[i-1].y, midPoint.x, midPoint.y);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.stroke();
    } else if (points.length === 1) {
        ctx.arc(points[0].x, points[0].y, brush.size / 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore()

    layer.version++
  }

  // NOVA AÇÃO: Apagar da camada
  function eraseFromLayer(points) {
    if (!selectedLayer.value || !selectedLayer.value.image) return
    const layer = selectedLayer.value
    const ctx = layer.image.getContext('2d')

    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.globalAlpha = eraser.opacity
    ctx.strokeStyle = 'rgba(0,0,0,1)'
    ctx.lineWidth = eraser.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath();
    if (points.length > 1) {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    } else if (points.length === 1) {
        ctx.arc(points[0].x, points[0].y, eraser.size / 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore()

    layer.version++
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null
  }

  function floodFillLayer(startX, startY, tolerance = 30) {
    if (!selectedLayer.value || !selectedLayer.value.image) return
    const layer = selectedLayer.value
    const canvas = layer.image
    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const { data } = imageData
    const { width, height } = canvas

    startX = Math.floor(startX)
    startY = Math.floor(startY)

    const startIndex = (startY * width + startX) * 4
    const startR = data[startIndex]
    const startG = data[startIndex + 1]
    const startB = data[startIndex + 2]

    const fillColor = hexToRgb(primaryColor.value)
    if (!fillColor) return

    if (
      fillColor.r === startR &&
      fillColor.g === startG &&
      fillColor.b === startB
    ) {
      return
    }

    const pixelStack = [[startX, startY]]

    while (pixelStack.length) {
      const [x, y] = pixelStack.pop()
      let currentIndex = (y * width + x) * 4

      if (y < 0 || y >= height || x < 0 || x >= width) continue

      const r = data[currentIndex]
      const g = data[currentIndex + 1]
      const b = data[currentIndex + 2]

      const colorDistance = Math.sqrt(
        (r - startR) ** 2 + (g - startG) ** 2 + (b - startB) ** 2
      )

      if (colorDistance <= tolerance && data[currentIndex + 3] > 0) {
        data[currentIndex] = fillColor.r
        data[currentIndex + 1] = fillColor.g
        data[currentIndex + 2] = fillColor.b
        data[currentIndex + 3] = 255 * brush.opacity

        pixelStack.push([x + 1, y])
        pixelStack.push([x - 1, y])
        pixelStack.push([x, y + 1])
        pixelStack.push([x, y - 1])
      }
    }
    ctx.putImageData(imageData, 0, 0)
    layer.version++
  }

  async function getLayerBlob(layer) {
    if (!layer) return null
    if (layer.originalFile) {
      return layer.originalFile
    }
    if (layer.imageUrl) {
      try {
        const response = await fetch(layer.imageUrl)
        if (!response.ok) throw new Error('Network response was not ok.')
        return await response.blob()
      } catch (error) {
        console.error(`Erro ao baixar o ficheiro da camada ${layer.name}:`, error)
        return null
      }
    }
    return null
  }

  function calculateAndUpdateDimensions(widthInWorld, heightInWorld) {
    const selection = workspace.selection
    selection.dimPxW = widthInWorld
    selection.dimPxH = heightInWorld

    if (!mockupLayer.value || !mockupLayer.value.metadata.dpi) {
      selection.dimCmW = 0
      selection.dimCmH = 0
      return
    }
    const { metadata, scale } = mockupLayer.value
    const totalMockupPxW = metadata.originalWidth * scale
    const totalMockupPxH = metadata.originalHeight * scale
    const totalMockupCmW = (totalMockupPxW / metadata.dpi) * 2.54
    const totalMockupCmH = (totalMockupPxH / metadata.dpi) * 2.54

    selection.dimCmW = totalMockupPxW > 0 ? (widthInWorld / totalMockupPxW) * totalMockupCmW : 0
    selection.dimCmH = totalMockupPxH > 0 ? (heightInWorld / totalMockupPxH) * totalMockupCmH : 0
  }

  function startLasso(worldPoint) {
    workspace.lasso.active = true
    workspace.lasso.points = [worldPoint]
    workspace.lasso.boundingBox = { x: worldPoint.x, y: worldPoint.y, width: 0, height: 0 }
    calculateAndUpdateDimensions(0, 0)
  }

  function updateLasso(worldPoint) {
    if (!workspace.lasso.active) return
    workspace.lasso.points.push(worldPoint)
    const { points } = workspace.lasso
    let minX = points[0].x, maxX = points[0].x, minY = points[0].y, maxY = points[0].y
    for (let i = 1; i < points.length; i++) {
      minX = Math.min(minX, points[i].x)
      maxX = Math.max(maxX, points[i].x)
      minY = Math.min(minY, points[i].y)
      maxY = Math.max(maxY, points[i].y)
    }
    const bbox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    workspace.lasso.boundingBox = bbox
    calculateAndUpdateDimensions(bbox.width, bbox.height)
  }

  function endLasso(mousePosition) {
    workspace.lasso.active = false
    if (workspace.viewMode === 'edit' && workspace.lasso.points.length > 2) {
      showSelectionContextMenu(true, mousePosition)
    }
  }

  function startSelection(worldMouse) {
    workspace.selection.active = true
    workspace.selection.startX = worldMouse.x
    workspace.selection.startY = worldMouse.y
    workspace.selection.endX = worldMouse.x
    workspace.selection.endY = worldMouse.y
    updateSelection(worldMouse)
  }

  function updateSelection(worldMouse) {
    if (!workspace.selection.active) return
    const sel = workspace.selection
    sel.endX = worldMouse.x
    sel.endY = worldMouse.y
    sel.width = Math.abs(sel.startX - sel.endX)
    sel.height = Math.abs(sel.startY - sel.endY)
    calculateAndUpdateDimensions(sel.width, sel.height)
  }

  function endSelection(mousePosition) {
    workspace.selection.active = false
    if (workspace.viewMode === 'edit' && workspace.selection.width > 0 && workspace.selection.height > 0) {
      showSelectionContextMenu(true, mousePosition)
    }
  }

  function clearSelection() {
    workspace.selection.active = false
    workspace.selection.width = 0
    workspace.selection.height = 0
    workspace.lasso.points = []
    workspace.lasso.active = false
    workspace.isSelectionContextMenuVisible = false
  }

  function addLayer(assetData, type) {
    const url = getSupabaseImageUrl(`${type}s`, assetData.file_path)
    processAndAddLayer({
      name: assetData.name || 'Nova Camada',
      type: type,
      imageUrl: url,
      metadata: assetData.metadata || { dpi: 96 },
    })
  }
  function addLocalLayer(file, type, dataUrl) {
    processAndAddLayer({
      name: file.name,
      type: type,
      imageUrl: dataUrl,
      metadata: { dpi: 96 },
      file: file,
    })
  }
  function updateLayerProperties(id, properties) {
    const index = layers.value.findIndex((l) => l.id === id)
    if (index > -1) {
      layers.value[index] = { ...layers.value[index], ...properties }
    }
  }
  function resizeMockup(newWidthPx, newHeightPx) {
    if (!mockupLayer.value) return
    const newScale = newWidthPx / mockupLayer.value.metadata.originalWidth
    updateLayerProperties(mockupLayer.value.id, { scale: newScale })
    workspace.document.width = newWidthPx
    workspace.document.height = newHeightPx
  }
  function showContextMenu(visible, position = { x: 0, y: 0 }, layerId = null) {
    workspace.isContextMenuVisible = visible
    workspace.contextMenuPosition = position
    workspace.contextMenuTargetLayerId = layerId
    if (visible && layerId) selectLayer(layerId)
  }
  function showSelectionContextMenu(visible, position = { x: 0, y: 0 }) {
    workspace.isSelectionContextMenuVisible = visible
    workspace.selectionContextMenuPosition = position
  }
  function showResizeModal(visible) {
    workspace.isResizeModalVisible = visible
  }
  function frameLayer(layerId) {
    const layer = layers.value.find((l) => l.id === layerId)
    const canvasEl = document.getElementById('mainCanvas')
    if (!layer || !canvasEl || !layer.metadata.originalWidth) return
    const padding = 0.8
    const layerWidth = layer.metadata.originalWidth * layer.scale
    const layerHeight = layer.metadata.originalHeight * layer.scale
    const zoomX = (canvasEl.clientWidth * padding) / layerWidth
    const zoomY = (canvasEl.clientHeight * padding) / layerHeight
    const newZoom = Math.min(zoomX, zoomY, 2)
    workspace.zoom = newZoom
    workspace.pan.x = canvasEl.clientWidth / 2 - layer.x * newZoom
    workspace.pan.y = canvasEl.clientHeight / 2 - layer.y * newZoom
  }
  function setRulerUnit(unit) {
    workspace.rulers.unit = unit
  }
  function togglePreviewInteractivity() {
    workspace.previewIsInteractive = !workspace.previewIsInteractive
    if (!workspace.previewIsInteractive) endLasso()
  }
  function setPreviewZoom(zoom) {
    workspace.previewZoom = zoom
  }
  function selectLayer(id) {
    selectedLayerId.value = id
  }
  function startLayerResize(mousePos, initialScale) {
    if (!selectedLayer.value) return;
    workspace.transformStart.mousePos = mousePos;
    workspace.transformStart.scale = initialScale;
    workspace.transformStart.layerCenter = { x: selectedLayer.value.x, y: selectedLayer.value.y };
  }

  function updateLayerResize(mousePos) {
    if (!selectedLayer.value) return;

    const { transformStart, pan, zoom } = workspace;
    const layer = selectedLayer.value;

    const centerScreenX = transformStart.layerCenter.x * zoom + pan.x;
    const centerScreenY = transformStart.layerCenter.y * zoom + pan.y;

    const initialDx = transformStart.mousePos.x - centerScreenX;
    const initialDy = transformStart.mousePos.y - centerScreenY;
    const initialDist = Math.sqrt(initialDx * initialDx + initialDy * initialDy);

    const currentDx = mousePos.x - centerScreenX;
    const currentDy = mousePos.y - centerScreenY;
    const currentDist = Math.sqrt(currentDx * currentDx + currentDy * currentDy);

    if (initialDist === 0) return;

    const scaleFactor = currentDist / initialDist;
    const newScale = transformStart.scale * scaleFactor;

    updateLayerProperties(layer.id, { scale: Math.max(0.01, newScale) });
  }
  function startLayerRotation(startAngle) {
    if (!selectedLayer.value) return
    workspace.transformStart.rotation = startAngle
    workspace.transformStart.layerRotation = selectedLayer.value.rotation
  }
  function updateLayerRotation(currentAngle) {
    if (!selectedLayer.value) return
    const { transformStart } = workspace
    const angleDiff = currentAngle - transformStart.rotation
    updateLayerProperties(selectedLayer.value.id, {
      rotation: transformStart.layerRotation + angleDiff,
    })
  }
  function deleteLayer(id) {
    const index = layers.value.findIndex((l) => l.id === id)
    if (index > -1) {
      const layerToDelete = layers.value[index]
      if (layerToDelete.imageUrl && layerToDelete.imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(layerToDelete.imageUrl)
      }
      layers.value.splice(index, 1)
      if (selectedLayerId.value === id) {
        selectedLayerId.value =
          layers.value.length > 0 ? layers.value[Math.min(index, layers.value.length - 1)].id : null
      }
    }
  }
  function bringForward(id) {
    const index = layers.value.findIndex((l) => l.id === id)
    if (index < layers.value.length - 1) {
      const layer = layers.value.splice(index, 1)[0]
      layers.value.splice(index + 1, 0, layer)
    }
  }
  function sendBackward(id) {
    const index = layers.value.findIndex((l) => l.id === id)
    if (index > 0) {
      const layer = layers.value.splice(index, 1)[0]
      layers.value.splice(index - 1, 0, layer)
    }
  }
  function moveLayer(fromIndex, toIndex) {
    const [movedLayer] = layers.value.splice(fromIndex, 1)
    layers.value.splice(toIndex, 0, movedLayer)
  }
  function toggleViewMode() {
    workspace.viewMode = workspace.viewMode === 'edit' ? 'preview' : 'edit'
    if (workspace.viewMode === 'edit' && selectedLayer.value) {
      frameLayer(selectedLayer.value.id)
    }
  }
  function getSupabaseImageUrl(bucket, path) {
    if (!bucket || !path) return null
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }
  function setActiveTool(tool) {
    activeTool.value = tool
    if (!tool || !tool.includes('select')) {
      clearSelection()
    }
    const isPaintTool = tool === 'brush' || tool === 'eraser'
    if (isPaintTool && !workspace.isBrushSidebarVisible) {
      workspace.isBrushSidebarVisible = true
    } else if (!isPaintTool && workspace.isBrushSidebarVisible) {
      workspace.isBrushSidebarVisible = false
    }
  }
  function updateWorkspace(properties) {
    Object.assign(workspace, properties)
  }
  function showPreviewSidebar(visible) {
    workspace.isPreviewSidebarVisible = visible
  }
  function showSignatureModal(visible) {
    workspace.isSignatureModalVisible = visible
  }

  function updateLayerAdjustments(layerId, newAdjustments) {
    const layer = layers.value.find((l) => l.id === layerId)
    if (layer) {
      layer.adjustments = { ...layer.adjustments, ...newAdjustments }
    }
  }

  function flipLayer(axis) {
    if (!selectedLayer.value) return
    const prop = axis === 'horizontal' ? 'flipH' : 'flipV'
    const currentFlip = selectedLayer.value.adjustments[prop]
    updateLayerAdjustments(selectedLayer.value.id, { [prop]: !currentFlip })
  }

  function rotateLayer(degrees) {
    if (!selectedLayer.value) return
    const newRotation = selectedLayer.value.rotation + (degrees * Math.PI) / 180
    updateLayerProperties(selectedLayer.value.id, { rotation: newRotation })
  }

  function duplicateLayer(layerId) {
    const sourceLayer = layers.value.find((l) => l.id === layerId)
    if (!sourceLayer) return

    const newCanvas = document.createElement('canvas');
    newCanvas.width = sourceLayer.image.width;
    newCanvas.height = sourceLayer.image.height;
    newCanvas.getContext('2d').drawImage(sourceLayer.image, 0, 0);

    const newLayerData = reactive({
      id: uuidv4(),
      name: `${sourceLayer.name} Cópia`,
      type: sourceLayer.type,
      visible: sourceLayer.visible,
      opacity: sourceLayer.opacity,
      imageUrl: sourceLayer.imageUrl,
      x: sourceLayer.x + 20,
      y: sourceLayer.y + 20,
      scale: sourceLayer.scale,
      rotation: sourceLayer.rotation,
      metadata: JSON.parse(JSON.stringify(sourceLayer.metadata)),
      adjustments: JSON.parse(JSON.stringify(sourceLayer.adjustments)),
      image: newCanvas,
      fullResImage: sourceLayer.fullResImage,
      originalFile: sourceLayer.originalFile,
      version: 1,
    })

    const sourceIndex = layers.value.findIndex((l) => l.id === layerId)
    layers.value.splice(sourceIndex + 1, 0, newLayerData)
    selectLayer(newLayerData.id)
  }

  // NOVA AÇÃO: Mesclar Camadas
  function mergeDown(layerId) {
    const topLayerIndex = layers.value.findIndex(l => l.id === layerId);
    if (topLayerIndex <= 0) return; // Não pode mesclar a camada base

    const topLayer = layers.value[topLayerIndex];
    const bottomLayer = layers.value[topLayerIndex - 1];

    const bottomCtx = bottomLayer.image.getContext('2d');

    // Desenha a camada de cima na camada de baixo, respeitando transformações
    bottomCtx.save();
    bottomCtx.globalAlpha = topLayer.opacity;

    // A transformação é relativa da camada de cima para a de baixo
    const relativeX = (topLayer.x - bottomLayer.x) / bottomLayer.scale + (bottomLayer.metadata.originalWidth/2);
    const relativeY = (topLayer.y - bottomLayer.y) / bottomLayer.scale + (bottomLayer.metadata.originalHeight/2);
    const relativeScale = topLayer.scale / bottomLayer.scale;
    const relativeRotation = topLayer.rotation - bottomLayer.rotation;

    bottomCtx.translate(relativeX, relativeY);
    bottomCtx.rotate(relativeRotation);
    bottomCtx.scale(relativeScale, relativeScale);

    bottomCtx.drawImage(
      topLayer.image,
      -topLayer.metadata.originalWidth / 2,
      -topLayer.metadata.originalHeight / 2
    );
    bottomCtx.restore();

    bottomLayer.version++;
    deleteLayer(layerId);
    selectLayer(bottomLayer.id);
  }

  function createImageFromSelection(sourceLayer, deleteFromOriginal = false) {
    if (!sourceLayer || !isSelectionActive.value) return null

    const sourceImage = sourceLayer.fullResImage || sourceLayer.image

    const path = new Path2D()
    const selectionPoints =
      workspace.lasso.points.length > 2
        ? workspace.lasso.points
        : [
            { x: workspace.selection.startX, y: workspace.selection.startY },
            { x: workspace.selection.endX, y: workspace.selection.startY },
            { x: workspace.selection.endX, y: workspace.selection.endY },
            { x: workspace.selection.startX, y: workspace.selection.endY },
          ]

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity

    selectionPoints.forEach((p, index) => {
      const workspaceX = p.x
      const workspaceY = p.y

      const cos = Math.cos(-sourceLayer.rotation)
      const sin = Math.sin(-sourceLayer.rotation)
      const dx = (workspaceX - sourceLayer.x) / sourceLayer.scale
      const dy = (workspaceY - sourceLayer.y) / sourceLayer.scale
      const layerX = dx * cos - dy * sin + sourceLayer.metadata.originalWidth / 2
      const layerY = dx * sin + dy * cos + sourceLayer.metadata.originalHeight / 2

      if (index === 0) path.moveTo(layerX, layerY)
      else path.lineTo(layerX, layerY)

      minX = Math.min(minX, layerX)
      minY = Math.min(minY, layerY)
      maxX = Math.max(maxX, layerX)
      maxY = Math.max(maxY, layerY)
    })
    path.closePath()

    const trimWidth = maxX - minX
    const trimHeight = maxY - minY

    if (trimWidth <= 0 || trimHeight <= 0) return null

    const trimmedCanvas = document.createElement('canvas')
    trimmedCanvas.width = trimWidth
    trimmedCanvas.height = trimHeight
    const trimmedCtx = trimmedCanvas.getContext('2d')

    trimmedCtx.translate(-minX, -minY)
    trimmedCtx.clip(path)
    trimmedCtx.drawImage(sourceImage, 0, 0)

    if (deleteFromOriginal) {
      const originalCtx = sourceLayer.image.getContext('2d')
      if (originalCtx) {
        originalCtx.save()
        originalCtx.globalCompositeOperation = 'destination-out'
        originalCtx.fill(path)
        originalCtx.restore()
        sourceLayer.version++
      }
    }

    return {
      imageDataUrl: trimmedCanvas.toDataURL(),
      width: trimWidth,
      height: trimHeight,
    }
  }

  function copySelectionToClipboard() {
    if (!selectedLayer.value || !isSelectionActive.value) return
    const selectionData = createImageFromSelection(selectedLayer.value, false)
    if (selectionData) {
      copiedSelection.value = {
        ...selectionData,
        metadata: selectedLayer.value.metadata,
      }
    }
    clearSelection()
  }

  function pasteSelection() {
    if (!copiedSelection.value) return
    processAndAddLayer({
      name: 'Seleção Colada',
      type: 'pattern',
      imageUrl: copiedSelection.value.imageDataUrl,
      metadata: {
        dpi: copiedSelection.value.metadata.dpi || 96,
        originalWidth: copiedSelection.value.width,
        originalHeight: copiedSelection.value.height,
      },
      initialPosition: { x: workspace.document.width / 2, y: workspace.document.height / 2 },
    })
  }

  function duplicateSelection() {
    if (!selectedLayer.value || !isSelectionActive.value) return
    const selectionData = createImageFromSelection(selectedLayer.value, false)
    if (selectionData) {
      processAndAddLayer({
        name: `${selectedLayer.value.name} Cópia`,
        type: selectedLayer.value.type,
        imageUrl: selectionData.imageDataUrl,
        metadata: {
          dpi: selectedLayer.value.metadata.dpi,
          originalWidth: selectionData.width,
          originalHeight: selectionData.height,
        },
        initialPosition: { x: selectedLayer.value.x, y: selectedLayer.value.y },
      })
    }
    clearSelection()
  }

  function cutoutSelection() {
    if (!selectedLayer.value || !isSelectionActive.value) return
    const selectionData = createImageFromSelection(selectedLayer.value, true)
    if (selectionData) {
      processAndAddLayer({
        name: `${selectedLayer.value.name} Recorte`,
        type: selectedLayer.value.type,
        imageUrl: selectionData.imageDataUrl,
        metadata: {
          dpi: selectedLayer.value.metadata.dpi,
          originalWidth: selectionData.width,
          originalHeight: selectionData.height,
        },
        initialPosition: { x: selectedLayer.value.x, y: selectedLayer.value.y },
      })
    }
    clearSelection()
  }

  function setPaintTool(tool) {
    paintTool.value = tool
  }
  function setBrushOption(option, value) {
    brush[option] = value
  }
  function setEraserOption(option, value) {
    eraser[option] = value
  }
  function setPrimaryColor(color) {
    primaryColor.value = color
  }
  function toggleBrushSidebar() {
    workspace.isBrushSidebarVisible = !workspace.isBrushSidebarVisible
  }

  return {
    layers,
    selectedLayerId,
    selectedLayer,
    activeTool,
    workspace,
    mockupLayer,
    rulerSource,
    isSelectionActive,
    copiedSelection,
    paintTool,
    primaryColor,
    brush,
    eraser,
    setRulerUnit,
    togglePreviewInteractivity,
    setPreviewZoom,
    startLasso,
    updateLasso,
    endLasso,
    addLayer,
    addLocalLayer,
    selectLayer,
    updateLayerProperties,
    setActiveTool,
    updateWorkspace,
    toggleViewMode,
    deleteLayer,
    bringForward,
    sendBackward,
    moveLayer,
    frameLayer,
    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    startLayerResize,
    updateLayerResize,
    startLayerRotation,
    updateLayerRotation,
    showContextMenu,
    showSelectionContextMenu,
    showResizeModal,
    resizeMockup,
    showPreviewSidebar,
    showSignatureModal,
    getLayerBlob,
    updateLayerAdjustments,
    flipLayer,
    rotateLayer,
    duplicateLayer,
    copySelectionToClipboard,
    pasteSelection,
    duplicateSelection,
    cutoutSelection,
    applyPaintToLayer,
    floodFillLayer,
    setPaintTool,
    setBrushOption,
    setEraserOption,
    setPrimaryColor,
    toggleBrushSidebar,
    eraseFromLayer,
    mergeDown,
  }
})
