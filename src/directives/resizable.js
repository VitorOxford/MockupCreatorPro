// src/directives/resizable.js
import { useCanvasStore } from '@/stores/canvasStore';

export const resizable = {
  mounted(el, binding) {
    const store = useCanvasStore();
    const panelId = binding.value?.panelId;
    if (!store || !panelId) return;

    const handles = el.querySelectorAll('.resize-handle');
    let originalWidth, originalHeight, originalX, originalY, originalMouseX, originalMouseY;
    let currentHandleType; // Variável para guardar a alça atual

    const onMouseMove = (e) => {
      e.preventDefault();
      window.requestAnimationFrame(() => {
        let newWidth = originalWidth;
        let newHeight = originalHeight;
        let newLeft = el.offsetLeft;
        let newTop = el.offsetTop;

        const dx = e.clientX - originalMouseX;
        const dy = e.clientY - originalMouseY;

        // Usa a variável 'currentHandleType' que foi definida no mousedown
        if (currentHandleType.includes('right')) {
          newWidth = originalWidth + dx;
        }
        if (currentHandleType.includes('bottom')) {
          newHeight = originalHeight + dy;
        }
        if (currentHandleType.includes('left')) {
          newWidth = originalWidth - dx;
          newLeft = originalX + dx;
        }
        if (currentHandleType.includes('top')) {
          newHeight = originalHeight - dy;
          newTop = originalY + dy;
        }

        if (newWidth > 250) { // Largura mínima
          el.style.width = `${newWidth}px`;
          el.style.left = `${newLeft}px`;
        }
        if (newHeight > 150) { // Altura mínima
          el.style.height = `${newHeight}px`;
          el.style.top = `${newTop}px`;
        }
      });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      const rect = el.getBoundingClientRect();
      store.updatePanelState(panelId, {
        size: { width: rect.width, height: rect.height }
      });
    };

    handles.forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        currentHandleType = e.target.dataset.handle; // Captura a alça no início
        originalWidth = el.offsetWidth;
        originalHeight = el.offsetHeight;
        originalX = el.offsetLeft;
        originalY = el.offsetTop;
        originalMouseX = e.clientX;
        originalMouseY = e.clientY;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp, { once: true });
      });
    });

    el.__vResizableCleanup = () => {
      // Lógica de limpeza, se necessário
    };
  },
  unmounted(el) {
    if (el.__vResizableCleanup) {
      el.__vResizableCleanup();
    }
  },
};
