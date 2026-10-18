/**
 * FloraScan AI — Web UI Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements - Studio
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const cameraInput = document.getElementById('cameraInput');
  const btnBrowse = document.getElementById('btnBrowse');
  const btnCamera = document.getElementById('btnCamera');
  
  const previewEmptyState = document.getElementById('previewEmptyState');
  const previewActiveState = document.getElementById('previewActiveState');
  const leafPreviewImg = document.getElementById('leafPreviewImg');
  const laserScanner = document.getElementById('laserScanner');
  const scanStatusBadge = document.getElementById('scanStatusBadge');
  const previewFileName = document.getElementById('previewFileName');
  const previewFileSize = document.getElementById('previewFileSize');
  const btnClearImage = document.getElementById('btnClearImage');
  const btnDiagnose = document.getElementById('btnDiagnose');

  // Results Elements
  const resultsCard = document.getElementById('resultsCard');
  const resultHealthBadge = document.getElementById('resultHealthBadge');
  const resultCropName = document.getElementById('resultCropName');
  const resultDiseaseName = document.getElementById('resultDiseaseName');
  const confidencePct = document.getElementById('confidencePct');
  const circleProgress = document.getElementById('circleProgress');
  const pesticidePills = document.getElementById('pesticidePills');
  const treatmentAdviceNote = document.getElementById('treatmentAdviceNote');
  const btnCopyReport = document.getElementById('btnCopyReport');
  const btnResetScan = document.getElementById('btnResetScan');

  // Sample Buttons
  const btnSampleTomato = document.getElementById('btnSampleTomato');
  const btnSampleApple = document.getElementById('btnSampleApple');

  // History & Toast
  const historyList = document.getElementById('historyList');
  const btnClearHistory = document.getElementById('btnClearHistory');
  const toastContainer = document.getElementById('toastContainer');

  // Navigation
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // Directory Elements
  const directorySearchInput = document.getElementById('directorySearchInput');
  const directoryGrid = document.getElementById('directoryGrid');
  const cropFilterChips = document.getElementById('cropFilterChips');

  // State
  let currentFile = null;
  let currentPreviewUrl = null;
  let lastDiagnosis = null;
  let classesData = null;

  // -------------------------------------------------------------
  // Toast Helper
  // -------------------------------------------------------------
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
    toast.innerHTML = `
      <span>${type === 'error' ? '⚠️' : '🌿'}</span>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // -------------------------------------------------------------
  // Navigation Tabs Switching
  // -------------------------------------------------------------
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetId = tab.getAttribute('data-target');
      tabPanes.forEach(pane => {
        if (pane.id === targetId) {
          pane.classList.remove('hidden');
        } else {
          pane.classList.add('hidden');
        }
      });

      if (targetId === 'tabDirectory' && !classesData) {
        loadDiseaseDirectory();
      }
    });
  });

  // -------------------------------------------------------------
  // File Handling & Loading
  // -------------------------------------------------------------
  function handleSelectedFile(file) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPEG, PNG, WEBP).', 'error');
      return;
    }

    currentFile = file;

    // Release old object URL if exists
    if (currentPreviewUrl && currentPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(currentPreviewUrl);
    }
    currentPreviewUrl = URL.createObjectURL(file);

    leafPreviewImg.src = currentPreviewUrl;
    previewFileName.textContent = file.name || 'leaf_capture.jpg';
    previewFileSize.textContent = formatBytes(file.size);

    previewEmptyState.classList.add('hidden');
    previewEmptyState.style.display = 'none';
    previewActiveState.classList.remove('hidden');
    previewActiveState.style.display = 'flex';
    resultsCard.classList.add('hidden');

    scanStatusBadge.textContent = 'Ready to Analyze';
    scanStatusBadge.style.color = '#34d399';
    btnDiagnose.disabled = false;
    btnDiagnose.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Browse & Camera Trigger
  btnBrowse.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  btnCamera.addEventListener('click', (e) => {
    e.stopPropagation();
    cameraInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectedFile(e.target.files[0]);
    }
  });

  cameraInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectedFile(e.target.files[0]);
    }
  });

  // Dropzone Drag & Drop
  dropZone.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files[0]) {
      handleSelectedFile(dt.files[0]);
    }
  });

  // Global Clipboard Paste (Ctrl+V anywhere)
  document.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        handleSelectedFile(file);
        showToast('Leaf image pasted from clipboard! 📋');
        break;
      }
    }
  });

  // Sample Buttons
  async function loadSampleImage(url, name) {
    try {
      scanStatusBadge.textContent = 'Loading sample...';
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], name, { type: 'image/jpeg' });
      handleSelectedFile(file);
      showToast(`Loaded ${name} sample! Click "Analyze Health" to scan.`);
    } catch (err) {
      showToast('Could not load sample image', 'error');
    }
  }

  btnSampleTomato.addEventListener('click', () => {
    loadSampleImage('/static/samples/tomato_blight.jpg', 'tomato_late_blight.jpg');
  });

  btnSampleApple.addEventListener('click', () => {
    loadSampleImage('/static/samples/healthy_apple.jpg', 'healthy_apple.jpg');
  });

  // Clear / Reset
  function clearPreview() {
    currentFile = null;
    if (currentPreviewUrl && currentPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(currentPreviewUrl);
    }
    currentPreviewUrl = null;
    leafPreviewImg.src = '';
    previewActiveState.classList.add('hidden');
    previewActiveState.style.display = 'none';
    previewEmptyState.classList.remove('hidden');
    previewEmptyState.style.display = '';
    resultsCard.classList.add('hidden');
    scanStatusBadge.textContent = 'Awaiting Image';
    scanStatusBadge.style.color = '';
    fileInput.value = '';
    cameraInput.value = '';
  }

  btnClearImage.addEventListener('click', clearPreview);
  btnResetScan.addEventListener('click', clearPreview);

  // -------------------------------------------------------------
  // Diagnosis Prediction Request (POST /predict)
  // -------------------------------------------------------------
  btnDiagnose.addEventListener('click', async () => {
    if (!currentFile) {
      showToast('Please select or upload a leaf photo first', 'error');
      return;
    }

    // Set UI to analyzing state
    btnDiagnose.disabled = true;
    const originalBtnHtml = btnDiagnose.innerHTML;
    btnDiagnose.innerHTML = '<span class="btn-spinner"></span> Analyzing...';
    laserScanner.classList.remove('hidden');
    scanStatusBadge.textContent = 'Analyzing...';
    scanStatusBadge.style.color = '#38bdf8';
    resultsCard.classList.add('hidden');

    const formData = new FormData();
    formData.append('image', currentFile);

    try {
      const response = await fetch('/predict', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with code ${response.status}`);
      }

      const data = await response.json();
      displayResults(data);
      saveToHistory(data);
      showToast('Diagnosis complete! 🌿');
    } catch (err) {
      console.error(err);
      showToast(`Diagnosis failed: ${err.message}`, 'error');
      scanStatusBadge.textContent = 'Analysis Error';
      scanStatusBadge.style.color = '#ef4444';
    } finally {
      laserScanner.classList.add('hidden');
      btnDiagnose.disabled = false;
      if (typeof originalBtnHtml !== 'undefined') {
        btnDiagnose.innerHTML = originalBtnHtml;
      }
    }
  });

  // -------------------------------------------------------------
  // Display Results
  // -------------------------------------------------------------
  function parseClassName(rawClass) {
    // e.g. "Tomato___Late_blight" -> crop: "Tomato", disease: "Late Blight", isHealthy: false
    // or "Corn_(maize)___Common_rust_" -> crop: "Corn (maize)", disease: "Common Rust"
    const parts = rawClass.split('___');
    let crop = parts[0].replace(/_/g, ' ').trim();
    let condition = parts.length > 1 ? parts[1].replace(/_/g, ' ').trim() : 'Unknown';
    const isHealthy = condition.toLowerCase().includes('healthy');

    return { crop, condition, isHealthy, raw: rawClass };
  }

  function displayResults(data) {
    lastDiagnosis = data;
    const parsed = parseClassName(data.predicted_class);

    resultCropName.textContent = parsed.crop;
    resultDiseaseName.textContent = parsed.isHealthy ? 'Healthy Leaf' : parsed.condition;

    if (parsed.isHealthy) {
      resultHealthBadge.textContent = 'HEALTHY PLANT';
      resultHealthBadge.className = 'health-badge healthy';
      scanStatusBadge.textContent = 'Status: Healthy';
      scanStatusBadge.style.color = '#10b981';
    } else {
      resultHealthBadge.textContent = 'DISEASE DETECTED';
      resultHealthBadge.className = 'health-badge infected';
      scanStatusBadge.textContent = 'Status: Infected';
      scanStatusBadge.style.color = '#ef4444';
    }

    // Confidence Calculation & Animation
    const confVal = Math.round((data.confidence || 0) * 100);
    confidencePct.textContent = `${confVal}%`;
    circleProgress.setAttribute('stroke-dasharray', `${confVal}, 100`);

    if (confVal >= 90) {
      circleProgress.style.stroke = '#10b981';
    } else if (confVal >= 70) {
      circleProgress.style.stroke = '#f59e0b';
    } else {
      circleProgress.style.stroke = '#ef4444';
    }

    // Pesticide / Treatment Pills
    pesticidePills.innerHTML = '';
    const recommendations = data.recommended_pesticides || [];

    if (parsed.isHealthy || recommendations.length === 0 || recommendations.includes('No pesticide needed')) {
      const pill = document.createElement('span');
      pill.className = 'pesticide-pill healthy-pill';
      pill.innerHTML = '🌿 No pesticide needed — Maintain regular watering and sunlight.';
      pesticidePills.appendChild(pill);

      treatmentAdviceNote.innerHTML = `<strong>Care Note:</strong> The leaf tissue displays normal chlorophyll pigmentation and cellular structure. Continue routine monitoring and avoid overhead watering.`;
    } else {
      recommendations.forEach(med => {
        const pill = document.createElement('span');
        pill.className = 'pesticide-pill';
        pill.innerHTML = `💊 <strong>${escapeHtml(med)}</strong>`;
        pesticidePills.appendChild(pill);
      });

      treatmentAdviceNote.innerHTML = `<strong>Action Plan:</strong> Inspect nearby foliage immediately. Apply prescribed fungicides or treatments during early morning or evening to prevent phototoxicity. Remove and safely dispose of severely infected leaves.`;
    }

    resultsCard.classList.remove('hidden');
    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // -------------------------------------------------------------
  // Copy Report
  // -------------------------------------------------------------
  btnCopyReport.addEventListener('click', () => {
    if (!lastDiagnosis) return;
    const parsed = parseClassName(lastDiagnosis.predicted_class);
    const textReport = `======================================
🌿 FloraScan AI — Diagnostic Report
======================================
Crop: ${parsed.crop}
Condition: ${parsed.condition} (${parsed.isHealthy ? 'HEALTHY' : 'DISEASED'})
Confidence: ${(lastDiagnosis.confidence * 100).toFixed(1)}%
Recommended Pesticides / Treatments:
- ${lastDiagnosis.recommended_pesticides.join('\n- ')}
Timestamp: ${new Date().toLocaleString()}
======================================`;

    navigator.clipboard.writeText(textReport).then(() => {
      showToast('Diagnosis report copied to clipboard! 📋');
    }).catch(() => {
      showToast('Could not copy report', 'error');
    });
  });

  // -------------------------------------------------------------
  // Local History Management
  // -------------------------------------------------------------
  const STORAGE_KEY = 'florascan_recent_scans';

  function saveToHistory(data) {
    const parsed = parseClassName(data.predicted_class);
    const historyItem = {
      crop: parsed.crop,
      condition: parsed.condition,
      isHealthy: parsed.isHealthy,
      confidence: Math.round((data.confidence || 0) * 100),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      thumb: currentPreviewUrl
    };

    let history = [];
    try {
      history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      history = [];
    }

    history.unshift(historyItem);
    if (history.length > 8) history.pop();

    try {
      // Don't save large blob URLs directly to storage to prevent quota errors
      const storageSafe = history.map(h => ({ ...h, thumb: null }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storageSafe));
    } catch (e) {
      // Ignore storage quota
    }

    renderHistoryUI(history);
  }

  function loadHistoryUI() {
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      history = [];
    }
    renderHistoryUI(history);
  }

  function renderHistoryUI(history) {
    if (!history || history.length === 0) {
      historyList.innerHTML = '<p class="history-empty">Your diagnosed leaf history in this session will appear here.</p>';
      return;
    }

    historyList.innerHTML = '';
    history.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-item';
      card.innerHTML = `
        <div class="history-item-info">
          <span class="history-item-name">${escapeHtml(item.crop)} &bull; ${escapeHtml(item.condition)}</span>
          <span class="history-item-conf" style="color: ${item.isHealthy ? '#10b981' : '#f87171'}">
            ${item.isHealthy ? 'Healthy' : 'Diseased'} &bull; ${item.confidence}% &bull; ${item.timestamp}
          </span>
        </div>
      `;
      historyList.appendChild(card);
    });
  }

  btnClearHistory.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    renderHistoryUI([]);
    showToast('Session history cleared');
  });

  loadHistoryUI();

  // -------------------------------------------------------------
  // Disease Directory (Tab 2)
  // -------------------------------------------------------------
  async function loadDiseaseDirectory() {
    directoryGrid.innerHTML = '<p class="card-desc">Loading 38 disease profiles...</p>';
    try {
      const res = await fetch('/api/classes');
      classesData = await res.json();
      renderDirectory(classesData.classes, classesData.pesticides_map);
    } catch (err) {
      directoryGrid.innerHTML = '<p class="card-desc" style="color: #ef4444;">Failed to load disease directory.</p>';
    }
  }

  function renderDirectory(classes, pesticidesMap, filterCrop = 'all', query = '') {
    directoryGrid.innerHTML = '';
    const q = query.toLowerCase().trim();

    let count = 0;
    classes.forEach(cls => {
      const parsed = parseClassName(cls);
      const pesticides = pesticidesMap[cls] || [];

      if (filterCrop !== 'all' && !parsed.crop.toLowerCase().includes(filterCrop.toLowerCase())) {
        return;
      }

      if (q && !parsed.crop.toLowerCase().includes(q) && !parsed.condition.toLowerCase().includes(q)) {
        return;
      }

      count++;
      const card = document.createElement('div');
      card.className = 'disease-card';
      card.innerHTML = `
        <div class="disease-card-header">
          <span class="disease-card-crop">${escapeHtml(parsed.crop)}</span>
          <span class="health-badge ${parsed.isHealthy ? 'healthy' : 'infected'}">
            ${parsed.isHealthy ? 'HEALTHY' : 'DISEASE'}
          </span>
        </div>
        <div class="disease-card-name">${escapeHtml(parsed.condition)}</div>
        <div class="disease-card-pesticides">
          ${pesticides.map(p => `<span class="micro-pill">${escapeHtml(p)}</span>`).join('')}
        </div>
      `;
      directoryGrid.appendChild(card);
    });

    if (count === 0) {
      directoryGrid.innerHTML = '<p class="card-desc">No plant diseases matched your search criteria.</p>';
    }
  }

  directorySearchInput.addEventListener('input', (e) => {
    if (!classesData) return;
    const activeChip = cropFilterChips.querySelector('.chip.active');
    const filterCrop = activeChip ? activeChip.getAttribute('data-crop') : 'all';
    renderDirectory(classesData.classes, classesData.pesticides_map, filterCrop, e.target.value);
  });

  cropFilterChips.addEventListener('click', (e) => {
    if (e.target.classList.contains('chip')) {
      cropFilterChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
      if (classesData) {
        const filterCrop = e.target.getAttribute('data-crop');
        renderDirectory(classesData.classes, classesData.pesticides_map, filterCrop, directorySearchInput.value);
      }
    }
  });

  // -------------------------------------------------------------
  // Copy Code Snippets (Tab 3)
  // -------------------------------------------------------------
  document.querySelectorAll('.copy-code-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-copy');
      navigator.clipboard.writeText(code).then(() => {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = orig, 1800);
      });
    });
  });
});
