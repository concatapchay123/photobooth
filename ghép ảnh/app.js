const defaultTemplates = [
  { name: "Gumball - 4 slot", src: "./source/687f0219ebe02.png" },
  { name: "NEU News", src: "./source/68f215d332a18.png" }
];

const els = {
  canvas: document.getElementById("resultCanvas"),
  emptyState: document.getElementById("emptyState"),
  slotStatus: document.getElementById("slotStatus"),
  downloadBtn: document.getElementById("downloadBtn"),
  video: document.getElementById("cameraVideo"),
  cameraBox: document.querySelector(".camera-box"),
  capturedPreview: document.getElementById("capturedPreview"),
  cameraNotice: document.getElementById("cameraNotice"),
  startCameraBtn: document.getElementById("startCameraBtn"),
  captureBtn: document.getElementById("captureBtn"),
  photoInput: document.getElementById("photoInput"),
  templateSelect: document.getElementById("templateSelect"),
  templateInput: document.getElementById("templateInput"),
  coverModeBtn: document.getElementById("coverModeBtn"),
  containModeBtn: document.getElementById("containModeBtn"),
  zoomRange: document.getElementById("zoomRange"),
  offsetXRange: document.getElementById("offsetXRange"),
  offsetYRange: document.getElementById("offsetYRange"),
  mirrorToggle: document.getElementById("mirrorToggle")
};

const ctx = els.canvas.getContext("2d", { willReadFrequently: true });

const state = {
  template: null,
  templateSource: "",
  slots: [],
  photo: null,
  fitMode: "cover",
  stream: null
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Không tải được ảnh: ${src}`));
    img.src = src;
  });
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        resolve(await loadImage(reader.result));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Không đọc được file ảnh."));
    reader.readAsDataURL(file);
  });
}

function setNotice(text) {
  els.cameraNotice.textContent = text;
  els.cameraNotice.hidden = !text;
}

function setupTemplateSelect() {
  defaultTemplates.forEach((template, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = template.name;
    els.templateSelect.appendChild(option);
  });
}

function setCanvasSize(width, height) {
  els.canvas.width = width;
  els.canvas.height = height;
  els.canvas.style.aspectRatio = `${width} / ${height}`;
}

function detectTransparentSlots(image) {
  const scanCanvas = document.createElement("canvas");
  scanCanvas.width = image.naturalWidth || image.width;
  scanCanvas.height = image.naturalHeight || image.height;
  const scanCtx = scanCanvas.getContext("2d", { willReadFrequently: true });
  scanCtx.drawImage(image, 0, 0);

  const { width, height } = scanCanvas;
  const imageData = scanCtx.getImageData(0, 0, width, height);
  const alphaLimit = 24;
  const totalPixels = width * height;
  const transparent = new Uint8Array(totalPixels);

  for (let i = 0, p = 0; i < imageData.data.length; i += 4, p += 1) {
    transparent[p] = imageData.data[i + 3] <= alphaLimit ? 1 : 0;
  }

  const visited = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  const minArea = Math.max(12000, Math.floor(totalPixels * 0.012));
  const minWidth = Math.floor(width * 0.28);
  const minHeight = Math.floor(height * 0.06);
  const slots = [];

  for (let start = 0; start < totalPixels; start += 1) {
    if (!transparent[start] || visited[start]) continue;

    let head = 0;
    let tail = 0;
    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    queue[tail] = start;
    tail += 1;
    visited[start] = 1;

    while (head < tail) {
      const index = queue[head];
      head += 1;
      area += 1;

      const x = index % width;
      const y = Math.floor(index / width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      const left = index - 1;
      const right = index + 1;
      const up = index - width;
      const down = index + width;

      if (x > 0 && transparent[left] && !visited[left]) {
        visited[left] = 1;
        queue[tail] = left;
        tail += 1;
      }
      if (x < width - 1 && transparent[right] && !visited[right]) {
        visited[right] = 1;
        queue[tail] = right;
        tail += 1;
      }
      if (y > 0 && transparent[up] && !visited[up]) {
        visited[up] = 1;
        queue[tail] = up;
        tail += 1;
      }
      if (y < height - 1 && transparent[down] && !visited[down]) {
        visited[down] = 1;
        queue[tail] = down;
        tail += 1;
      }
    }

    const slotWidth = maxX - minX + 1;
    const slotHeight = maxY - minY + 1;
    if (area >= minArea && slotWidth >= minWidth && slotHeight >= minHeight) {
      slots.push({
        x: minX,
        y: minY,
        width: slotWidth,
        height: slotHeight,
        area
      });
    }
  }

  return slots.sort((a, b) => a.y - b.y || a.x - b.x).slice(0, 8);
}

async function setTemplate(image, sourceName) {
  state.template = image;
  state.templateSource = sourceName;
  state.slots = detectTransparentSlots(image);
  setCanvasSize(image.naturalWidth || image.width, image.naturalHeight || image.height);
  updateSlotStatus();
  render();
}

function updateSlotStatus() {
  const count = state.slots.length;
  const countText = count === 4 ? "Đã nhận 4 slot" : `Đã nhận ${count} slot`;
  els.slotStatus.textContent = `${countText} từ ${state.templateSource}`;
}

function drawPhotoIntoSlot(slot) {
  if (!state.photo) return;

  const zoom = Number(els.zoomRange.value);
  const offsetX = Number(els.offsetXRange.value) / 100;
  const offsetY = Number(els.offsetYRange.value) / 100;
  const imgW = state.photo.naturalWidth || state.photo.width;
  const imgH = state.photo.naturalHeight || state.photo.height;
  const imgRatio = imgW / imgH;
  const slotRatio = slot.width / slot.height;

  let drawW;
  let drawH;
  if (state.fitMode === "contain") {
    if (imgRatio > slotRatio) {
      drawW = slot.width;
      drawH = drawW / imgRatio;
    } else {
      drawH = slot.height;
      drawW = drawH * imgRatio;
    }
  } else if (imgRatio > slotRatio) {
    drawH = slot.height;
    drawW = drawH * imgRatio;
  } else {
    drawW = slot.width;
    drawH = drawW / imgRatio;
  }

  drawW *= zoom;
  drawH *= zoom;

  const maxMoveX = Math.max(0, (drawW - slot.width) / 2);
  const maxMoveY = Math.max(0, (drawH - slot.height) / 2);
  const x = slot.x + (slot.width - drawW) / 2 + offsetX * maxMoveX;
  const y = slot.y + (slot.height - drawH) / 2 + offsetY * maxMoveY;

  ctx.save();
  ctx.beginPath();
  ctx.rect(slot.x, slot.y, slot.width, slot.height);
  ctx.clip();
  ctx.drawImage(state.photo, x, y, drawW, drawH);
  ctx.restore();
}

function render() {
  if (!state.template) return;

  ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
  state.slots.forEach(drawPhotoIntoSlot);
  ctx.drawImage(state.template, 0, 0, els.canvas.width, els.canvas.height);

  els.emptyState.hidden = Boolean(state.photo);
  els.downloadBtn.disabled = !state.photo || !state.slots.length;
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setNotice("Trình duyệt này không hỗ trợ camera. Hãy tải ảnh lên.");
    return;
  }

  try {
    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
    }

    setNotice("Đang xin quyền camera...");
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 960 }
      },
      audio: false
    });
    els.video.srcObject = state.stream;
    els.video.hidden = false;
    els.capturedPreview.hidden = true;
    els.captureBtn.disabled = false;
    setNotice("");
  } catch (error) {
    console.error(error);
    setNotice("Không mở được camera. Bạn vẫn có thể tải ảnh lên.");
  }
}

function capturePhoto() {
  if (!els.video.videoWidth || !els.video.videoHeight) return;

  const snapCanvas = document.createElement("canvas");
  snapCanvas.width = els.video.videoWidth;
  snapCanvas.height = els.video.videoHeight;
  const snapCtx = snapCanvas.getContext("2d");

  if (els.mirrorToggle.checked) {
    snapCtx.translate(snapCanvas.width, 0);
    snapCtx.scale(-1, 1);
  }
  snapCtx.drawImage(els.video, 0, 0, snapCanvas.width, snapCanvas.height);

  const photo = new Image();
  photo.onload = () => {
    state.photo = photo;
    els.capturedPreview.src = photo.src;
    els.capturedPreview.hidden = false;
    els.video.hidden = true;
    render();
  };
  photo.src = snapCanvas.toDataURL("image/png");
}

function setFitMode(mode) {
  state.fitMode = mode;
  els.coverModeBtn.classList.toggle("active", mode === "cover");
  els.containModeBtn.classList.toggle("active", mode === "contain");
  render();
}

function downloadResult() {
  if (!state.photo) return;
  const link = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  link.download = `anh-ghep-${stamp}.png`;
  link.href = els.canvas.toDataURL("image/png");
  link.click();
}

function bindEvents() {
  els.startCameraBtn.addEventListener("click", startCamera);
  els.captureBtn.addEventListener("click", capturePhoto);
  els.downloadBtn.addEventListener("click", downloadResult);

  els.photoInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.photo = await fileToImage(file);
    els.capturedPreview.src = state.photo.src;
    els.capturedPreview.hidden = false;
    els.video.hidden = true;
    render();
  });

  els.templateSelect.addEventListener("change", async () => {
    const template = defaultTemplates[Number(els.templateSelect.value)];
    const image = await loadImage(template.src);
    await setTemplate(image, template.name);
  });

  els.templateInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const image = await fileToImage(file);
    await setTemplate(image, file.name);
  });

  els.coverModeBtn.addEventListener("click", () => setFitMode("cover"));
  els.containModeBtn.addEventListener("click", () => setFitMode("contain"));
  els.zoomRange.addEventListener("input", render);
  els.offsetXRange.addEventListener("input", render);
  els.offsetYRange.addEventListener("input", render);
  els.mirrorToggle.addEventListener("change", () => {
    els.cameraBox.classList.toggle("mirrored", els.mirrorToggle.checked);
  });
}

async function boot() {
  setupTemplateSelect();
  bindEvents();
  els.cameraBox.classList.toggle("mirrored", els.mirrorToggle.checked);

  try {
    const first = defaultTemplates[0];
    await setTemplate(await loadImage(first.src), first.name);
  } catch (error) {
    console.error(error);
    els.slotStatus.textContent = "Chưa tải được template.";
  }

  await startCamera();
}

boot();
