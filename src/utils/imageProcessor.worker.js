// src/utils/imageProcessor.worker.js

/**
 * Função para extrair o DPI de um ficheiro de imagem.
 */
async function getDpiFromImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const view = new DataView(event.target.result);
        if (view.byteLength < 2 || view.getUint16(0, false) !== 0xFFD8) {
          return resolve(96);
        }
        let offset = 2;
        while (offset < view.byteLength - 2) {
          const marker = view.getUint16(offset, false);
          offset += 2;
          if (marker === 0xFFE1) {
            if (view.getUint32(offset + 2, false) !== 0x45786966) {
              offset += view.getUint16(offset, false);
              continue;
            }
            const tiffOffset = offset + 6;
            const bigEndian = view.getUint16(tiffOffset, false) === 0x4D4D;
            let ifdOffset = tiffOffset + view.getUint32(tiffOffset + 4, bigEndian);
            if (ifdOffset >= view.byteLength) return resolve(96);
            const tagCount = view.getUint16(ifdOffset, bigEndian);
            ifdOffset += 2;
            for (let i = 0; i < tagCount; i++) {
              const currentTagOffset = ifdOffset + i * 12;
              if (currentTagOffset + 12 > view.byteLength) continue;
              const tagId = view.getUint16(currentTagOffset, bigEndian);
              if (tagId === 0x011A) {
                const valueType = view.getUint16(currentTagOffset + 2, bigEndian);
                if (valueType !== 5) continue;
                const valueOffset = tiffOffset + view.getUint32(currentTagOffset + 8, bigEndian);
                if (valueOffset + 8 > view.byteLength) continue;
                const numerator = view.getUint32(valueOffset, bigEndian);
                const denominator = view.getUint32(valueOffset + 4, bigEndian);
                if (denominator !== 0) return resolve(Math.round(numerator / denominator));
              }
            }
          }
          offset += view.getUint16(offset, false);
        }
        return resolve(96);
      } catch (e) {
        return resolve(96);
      }
    };
    reader.onerror = () => resolve(96);
    reader.readAsArrayBuffer(file.slice(0, 128 * 1024));
  });
}

/**
 * Listener principal do worker.
 */
self.onmessage = async (e) => {
  const { file } = e.data;
  const MAX_DISPLAY_SIZE = 8192; // Limite para a textura do canvas para evitar crashes do navegador
  const LOW_RES_PROXY_SIZE = 1000;

  try {
    const dpi = await getDpiFromImage(file);
    // Cria o bitmap na resolução máxima sempre
    let imageBitmap = await createImageBitmap(file);

    const originalWidth = imageBitmap.width;
    const originalHeight = imageBitmap.height;

    let proxyBitmap = null;
    let lowResProxy = null;

    if (originalWidth > LOW_RES_PROXY_SIZE || originalHeight > LOW_RES_PROXY_SIZE) {
        const lowResRatio = Math.min(LOW_RES_PROXY_SIZE / originalWidth, LOW_RES_PROXY_SIZE / originalHeight);
        lowResProxy = await createImageBitmap(file, {
            resizeWidth: Math.round(originalWidth * lowResRatio),
            resizeHeight: Math.round(originalHeight * lowResRatio),
            resizeQuality: 'low',
        });
    }

    // Cria um proxy para exibição apenas se exceder o limite seguro da textura do canvas
    if (originalWidth > MAX_DISPLAY_SIZE || originalHeight > MAX_DISPLAY_SIZE) {
      const ratio = Math.min(MAX_DISPLAY_SIZE / originalWidth, MAX_DISPLAY_SIZE / originalHeight);
      proxyBitmap = await createImageBitmap(file, {
        resizeWidth: Math.round(originalWidth * ratio),
        resizeHeight: Math.round(originalHeight * ratio),
        resizeQuality: 'high',
      });
    }

    self.postMessage({
      status: 'success',
      payload: {
        dpi,
        imageBitmap, // Resolução total
        proxyBitmap, // Resolução para exibição segura (pode ser null)
        lowResProxy, // Resolução para manipulação fluida (pode ser null)
        originalWidth,
        originalHeight,
      },
    }, [imageBitmap, proxyBitmap, lowResProxy].filter(Boolean));

  } catch (error) {
    console.error('Erro no Worker de processamento de imagem:', error);
    self.postMessage({
      status: 'error',
      payload: error.message,
    });
  }
};
