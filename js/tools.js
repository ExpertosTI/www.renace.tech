/**
 * RENACE.TECH — 12 Utility Tools
 * All client-side, no dependencies except QRCode (loaded in HTML)
 */

// ═══════════════════════════════════════════════════════════════
// TOOL DEFINITIONS
// ═══════════════════════════════════════════════════════════════
const TOOLS = {
  qr: {
    title: 'Generador QR',
    render: () => `
      <label>Texto o URL</label>
      <input type="text" id="qr-text" placeholder="https://renace.tech" value="https://renace.tech">
      <div class="tool-actions">
        <button class="tool-btn" onclick="generateQR()"><i class="fas fa-qrcode"></i> Generar</button>
        <button class="tool-btn-secondary" id="qr-download-btn" onclick="downloadQR()" style="display:none"><i class="fas fa-download"></i> Descargar</button>
      </div>
      <div id="qr-output"></div>
    `,
  },

  password: {
    title: 'Generador de Contraseñas',
    render: () => `
      <label>Longitud: <span id="pwd-len-display">16</span></label>
      <input type="range" id="pwd-length" min="8" max="64" value="16" oninput="document.getElementById('pwd-len-display').textContent=this.value">
      <div style="display:flex;flex-wrap:wrap;gap:1rem;margin-bottom:1rem">
        <label style="display:flex;align-items:center;gap:0.3rem;cursor:pointer"><input type="checkbox" id="pwd-upper" checked> Mayúsculas</label>
        <label style="display:flex;align-items:center;gap:0.3rem;cursor:pointer"><input type="checkbox" id="pwd-lower" checked> Minúsculas</label>
        <label style="display:flex;align-items:center;gap:0.3rem;cursor:pointer"><input type="checkbox" id="pwd-nums" checked> Números</label>
        <label style="display:flex;align-items:center;gap:0.3rem;cursor:pointer"><input type="checkbox" id="pwd-symbols" checked> Símbolos</label>
      </div>
      <div class="tool-actions">
        <button class="tool-btn" onclick="generatePassword()"><i class="fas fa-key"></i> Generar</button>
        <button class="tool-btn-secondary" onclick="copyResult('pwd-result')"><i class="fas fa-copy"></i> Copiar</button>
      </div>
      <div class="tool-result" id="pwd-result" style="font-size:1.1rem;letter-spacing:1px">—</div>
    `,
  },

  currency: {
    title: 'Conversor de Moneda',
    render: () => `
      <label>Monto</label>
      <input type="number" id="cur-amount" value="1000" step="0.01">
      <div style="display:flex;gap:0.75rem;margin-bottom:1rem">
        <div style="flex:1">
          <label>De</label>
          <select id="cur-from">
            <option value="DOP">DOP (Peso Dominicano)</option>
            <option value="USD" selected>USD (Dólar)</option>
            <option value="EUR">EUR (Euro)</option>
          </select>
        </div>
        <div style="flex:1">
          <label>A</label>
          <select id="cur-to">
            <option value="DOP" selected>DOP (Peso Dominicano)</option>
            <option value="USD">USD (Dólar)</option>
            <option value="EUR">EUR (Euro)</option>
          </select>
        </div>
      </div>
      <button class="tool-btn" onclick="convertCurrency()"><i class="fas fa-exchange-alt"></i> Convertir</button>
      <div class="tool-result" id="cur-result">—</div>
      <p style="font-size:0.7rem;color:var(--text-muted);margin-top:0.5rem">Tasas referenciales. Pueden variar según el mercado.</p>
    `,
  },

  image: {
    title: 'Compresor de Imágenes',
    render: () => `
      <label>Calidad: <span id="img-quality-display">80</span>%</label>
      <input type="range" id="img-quality" min="10" max="100" value="80" oninput="document.getElementById('img-quality-display').textContent=this.value">
      <input type="file" id="img-file" accept="image/*" style="margin-bottom:1rem">
      <div class="tool-actions">
        <button class="tool-btn" onclick="compressImage()"><i class="fas fa-compress"></i> Comprimir</button>
        <button class="tool-btn-secondary" id="img-download" onclick="downloadCompressed()" style="display:none"><i class="fas fa-download"></i> Descargar</button>
      </div>
      <div id="img-result" style="margin-top:1rem"></div>
    `,
  },

  json: {
    title: 'Formateador JSON',
    render: () => `
      <label>Pega tu JSON</label>
      <textarea id="json-input" rows="6" placeholder='{"key": "value"}'></textarea>
      <div class="tool-actions">
        <button class="tool-btn" onclick="formatJSON()"><i class="fas fa-code"></i> Formatear</button>
        <button class="tool-btn-secondary" onclick="minifyJSON()"><i class="fas fa-compress-alt"></i> Minificar</button>
        <button class="tool-btn-secondary" onclick="copyResult('json-result')"><i class="fas fa-copy"></i> Copiar</button>
      </div>
      <div class="tool-result" id="json-result">—</div>
    `,
  },

  base64: {
    title: 'Base64 Encoder/Decoder',
    render: () => `
      <label>Texto</label>
      <textarea id="b64-input" rows="4" placeholder="Escribe aquí..."></textarea>
      <div class="tool-actions">
        <button class="tool-btn" onclick="encodeB64()"><i class="fas fa-lock"></i> Codificar</button>
        <button class="tool-btn-secondary" onclick="decodeB64()"><i class="fas fa-unlock"></i> Decodificar</button>
        <button class="tool-btn-secondary" onclick="copyResult('b64-result')"><i class="fas fa-copy"></i> Copiar</button>
      </div>
      <div class="tool-result" id="b64-result">—</div>
    `,
  },

  gradient: {
    title: 'Generador de Gradientes CSS',
    render: () => `
      <div style="display:flex;gap:0.75rem;margin-bottom:1rem;flex-wrap:wrap">
        <div><label>Color 1</label><input type="color" id="grad-c1" value="#38bdf8"></div>
        <div><label>Color 2</label><input type="color" id="grad-c2" value="#a78bfa"></div>
        <div style="flex:1;min-width:120px">
          <label>Ángulo: <span id="grad-angle-display">135</span>°</label>
          <input type="range" id="grad-angle" min="0" max="360" value="135" oninput="document.getElementById('grad-angle-display').textContent=this.value;previewGradient()">
        </div>
      </div>
      <div id="grad-preview" style="height:120px;border-radius:var(--radius-md);margin-bottom:1rem;background:linear-gradient(135deg,#38bdf8,#a78bfa)"></div>
      <div class="tool-actions">
        <button class="tool-btn" onclick="previewGradient()"><i class="fas fa-eye"></i> Preview</button>
        <button class="tool-btn-secondary" onclick="copyResult('grad-result')"><i class="fas fa-copy"></i> Copiar CSS</button>
      </div>
      <div class="tool-result" id="grad-result">background: linear-gradient(135deg, #38bdf8, #a78bfa);</div>
    `,
  },

  lorem: {
    title: 'Generador Lorem Ipsum',
    render: () => `
      <label>Número de párrafos</label>
      <input type="number" id="lorem-count" value="3" min="1" max="20">
      <div class="tool-actions">
        <button class="tool-btn" onclick="generateLorem()"><i class="fas fa-paragraph"></i> Generar</button>
        <button class="tool-btn-secondary" onclick="copyResult('lorem-result')"><i class="fas fa-copy"></i> Copiar</button>
      </div>
      <div class="tool-result" id="lorem-result" style="white-space:pre-wrap">—</div>
    `,
  },

  color: {
    title: 'Paleta de Colores',
    render: () => `
      <label>Color base</label>
      <input type="color" id="color-base" value="#38bdf8" style="width:60px;height:40px;padding:2px">
      <button class="tool-btn" onclick="generatePalette()" style="margin:1rem 0"><i class="fas fa-palette"></i> Generar Paleta</button>
      <div id="color-palette" style="display:grid;grid-template-columns:repeat(5,1fr);gap:0.5rem"></div>
    `,
  },

  loan: {
    title: 'Calculadora de Préstamos',
    render: () => `
      <label>Monto del préstamo (DOP)</label>
      <input type="number" id="loan-amount" value="500000" step="1000">
      <label>Tasa de interés anual (%)</label>
      <input type="number" id="loan-rate" value="12" step="0.1">
      <label>Plazo (meses)</label>
      <input type="number" id="loan-term" value="36" min="1">
      <button class="tool-btn" onclick="calculateLoan()"><i class="fas fa-calculator"></i> Calcular</button>
      <div class="tool-result" id="loan-result" style="white-space:pre-wrap">—</div>
    `,
  },

  timestamp: {
    title: 'Conversor de Timestamps',
    render: () => `
      <label>Timestamp Unix (segundos)</label>
      <input type="number" id="ts-unix" placeholder="1700000000" value="${Math.floor(Date.now() / 1000)}">
      <div class="tool-actions">
        <button class="tool-btn" onclick="convertTimestamp()"><i class="fas fa-clock"></i> Convertir a Fecha</button>
        <button class="tool-btn-secondary" onclick="currentTimestamp()"><i class="fas fa-sync"></i> Ahora</button>
      </div>
      <div class="tool-result" id="ts-result">—</div>
      <label style="margin-top:1rem">Fecha a Timestamp</label>
      <input type="datetime-local" id="ts-date">
      <button class="tool-btn" onclick="dateToTimestamp()" style="margin-top:0.5rem"><i class="fas fa-hashtag"></i> Convertir a Timestamp</button>
      <div class="tool-result" id="ts-result2">—</div>
    `,
  },

  hash: {
    title: 'Generador de Hash',
    render: () => `
      <label>Texto</label>
      <textarea id="hash-input" rows="3" placeholder="Escribe aquí..."></textarea>
      <label>Algoritmo</label>
      <select id="hash-algo">
        <option value="SHA-256">SHA-256</option>
        <option value="SHA-1">SHA-1</option>
        <option value="SHA-384">SHA-384</option>
        <option value="SHA-512">SHA-512</option>
      </select>
      <div class="tool-actions">
        <button class="tool-btn" onclick="generateHash()"><i class="fas fa-fingerprint"></i> Generar Hash</button>
        <button class="tool-btn-secondary" onclick="copyResult('hash-result')"><i class="fas fa-copy"></i> Copiar</button>
      </div>
      <div class="tool-result" id="hash-result">—</div>
    `,
  },
};

// ═══════════════════════════════════════════════════════════════
// MODAL MANAGEMENT
// ═══════════════════════════════════════════════════════════════
function openToolModal(toolId) {
  const tool = TOOLS[toolId];
  if (!tool) return;

  document.getElementById('tool-modal-title').textContent = tool.title;
  document.getElementById('tool-modal-body').innerHTML = tool.render();
  document.getElementById('tool-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeToolModal() {
  document.getElementById('tool-modal').classList.remove('active');
  document.body.style.overflow = '';
}

// Bind cards
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('click', () => openToolModal(card.dataset.tool));
  });

  // Close modal on overlay click
  document.getElementById('tool-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'tool-modal') closeToolModal();
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeToolModal();
  });

  // Color inputs for gradient: auto-preview
  document.addEventListener('input', (e) => {
    if (e.target.id === 'grad-c1' || e.target.id === 'grad-c2') previewGradient();
  });
});

// ═══════════════════════════════════════════════════════════════
// UTILITY: Copy Result
// ═══════════════════════════════════════════════════════════════
function copyResult(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const text = el.textContent || el.innerText;
  navigator.clipboard.writeText(text).then(() => {
    showToast('¡Copiado al portapapeles!');
  }).catch(() => {
    showToast('Error al copiar', true);
  });
}

function showToast(msg, isError = false) {
  const t = document.createElement('div');
  t.className = `notification ${isError ? 'error' : 'success'}`;
  t.innerHTML = `<i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i><span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 50);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2500);
}

// ═══════════════════════════════════════════════════════════════
// TOOL IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════

// 1. QR Code
function generateQR() {
  const text = document.getElementById('qr-text')?.value;
  const output = document.getElementById('qr-output');
  if (!text || !output) return;
  output.innerHTML = '';

  if (typeof QRCode === 'undefined') {
    output.innerHTML = '<p style="color:var(--accent-red)">QR library not loaded</p>';
    return;
  }

  const canvas = document.createElement('canvas');
  QRCode.toCanvas(canvas, text, { width: 256, margin: 2, color: { dark: '#000', light: '#fff' } }, (err) => {
    if (err) { output.innerHTML = `<p style="color:var(--accent-red)">${err.message}</p>`; return; }
    output.appendChild(canvas);
    document.getElementById('qr-download-btn').style.display = '';
  });
}

function downloadQR() {
  const canvas = document.querySelector('#qr-output canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = 'qr-renace.png';
  link.href = canvas.toDataURL();
  link.click();
}

// 2. Password Generator
function generatePassword() {
  const len = parseInt(document.getElementById('pwd-length')?.value || '16');
  const upper = document.getElementById('pwd-upper')?.checked;
  const lower = document.getElementById('pwd-lower')?.checked;
  const nums = document.getElementById('pwd-nums')?.checked;
  const symbols = document.getElementById('pwd-symbols')?.checked;

  let chars = '';
  if (upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (lower) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (nums) chars += '0123456789';
  if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz0123456789';

  const array = new Uint32Array(len);
  crypto.getRandomValues(array);
  const pwd = Array.from(array, v => chars[v % chars.length]).join('');

  const result = document.getElementById('pwd-result');
  if (result) result.textContent = pwd;
}

// 3. Currency Converter
function convertCurrency() {
  // Reference rates (DOP is the base)
  const rates = { DOP: 1, USD: 0.0167, EUR: 0.0154 };
  const amount = parseFloat(document.getElementById('cur-amount')?.value || '0');
  const from = document.getElementById('cur-from')?.value || 'USD';
  const to = document.getElementById('cur-to')?.value || 'DOP';

  // Convert: amount in "from" → DOP → "to"
  const inDOP = amount / rates[from];
  const result = inDOP * rates[to];

  const el = document.getElementById('cur-result');
  if (el) {
    const formatted = new Intl.NumberFormat('es-DO', { style: 'currency', currency: to, minimumFractionDigits: 2 }).format(result);
    el.textContent = `${amount.toLocaleString()} ${from} = ${formatted}`;
  }
}

// 4. Image Compressor
let compressedBlob = null;

function compressImage() {
  const file = document.getElementById('img-file')?.files[0];
  const quality = parseInt(document.getElementById('img-quality')?.value || '80') / 100;
  const resultDiv = document.getElementById('img-result');
  if (!file || !resultDiv) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Limit max dimension to 2048
      let w = img.width, h = img.height;
      const max = 2048;
      if (w > max || h > max) {
        const ratio = Math.min(max / w, max / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);

      canvas.toBlob((blob) => {
        compressedBlob = blob;
        const origSize = (file.size / 1024).toFixed(1);
        const newSize = (blob.size / 1024).toFixed(1);
        const savings = ((1 - blob.size / file.size) * 100).toFixed(0);

        resultDiv.innerHTML = `
          <p style="color:var(--text-primary);margin-bottom:0.5rem">
            <strong>Original:</strong> ${origSize} KB → <strong>Comprimido:</strong> ${newSize} KB 
            <span style="color:var(--accent-green)">(${savings}% reducción)</span>
          </p>
          <img src="${URL.createObjectURL(blob)}" style="max-width:100%;max-height:200px;border-radius:var(--radius-sm);border:1px solid var(--border-color)">
        `;
        document.getElementById('img-download').style.display = '';
      }, 'image/jpeg', quality);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function downloadCompressed() {
  if (!compressedBlob) return;
  const url = URL.createObjectURL(compressedBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'compressed-image.jpg';
  a.click();
  URL.revokeObjectURL(url);
}

// 5. JSON Formatter
function formatJSON() {
  const input = document.getElementById('json-input')?.value;
  const result = document.getElementById('json-result');
  if (!result) return;
  try {
    const parsed = JSON.parse(input);
    result.textContent = JSON.stringify(parsed, null, 2);
    result.style.color = 'var(--accent-cyan)';
  } catch (e) {
    result.textContent = '❌ JSON inválido: ' + e.message;
    result.style.color = 'var(--accent-red)';
  }
}

function minifyJSON() {
  const input = document.getElementById('json-input')?.value;
  const result = document.getElementById('json-result');
  if (!result) return;
  try {
    const parsed = JSON.parse(input);
    result.textContent = JSON.stringify(parsed);
    result.style.color = 'var(--accent-cyan)';
  } catch (e) {
    result.textContent = '❌ JSON inválido: ' + e.message;
    result.style.color = 'var(--accent-red)';
  }
}

// 6. Base64
function encodeB64() {
  const input = document.getElementById('b64-input')?.value || '';
  const result = document.getElementById('b64-result');
  if (result) {
    try {
      result.textContent = btoa(unescape(encodeURIComponent(input)));
    } catch (e) {
      result.textContent = '❌ Error: ' + e.message;
    }
  }
}

function decodeB64() {
  const input = document.getElementById('b64-input')?.value || '';
  const result = document.getElementById('b64-result');
  if (result) {
    try {
      result.textContent = decodeURIComponent(escape(atob(input)));
    } catch (e) {
      result.textContent = '❌ Base64 inválido: ' + e.message;
    }
  }
}

// 7. Gradient Generator
function previewGradient() {
  const c1 = document.getElementById('grad-c1')?.value || '#38bdf8';
  const c2 = document.getElementById('grad-c2')?.value || '#a78bfa';
  const angle = document.getElementById('grad-angle')?.value || '135';
  const css = `linear-gradient(${angle}deg, ${c1}, ${c2})`;

  const preview = document.getElementById('grad-preview');
  const result = document.getElementById('grad-result');
  if (preview) preview.style.background = css;
  if (result) result.textContent = `background: ${css};`;
}

// 8. Lorem Ipsum
function generateLorem() {
  const SENTENCES = [
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
    'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.',
    'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.',
    'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.',
    'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.',
    'Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis.',
    'Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse.',
    'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis.',
    'Nam libero tempore, cum soluta nobis est eligendi optio cumque.',
    'Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus.',
  ];

  const count = parseInt(document.getElementById('lorem-count')?.value || '3');
  const paragraphs = [];

  for (let i = 0; i < count; i++) {
    const sentCount = 3 + Math.floor(Math.random() * 4);
    const shuffled = [...SENTENCES].sort(() => Math.random() - 0.5);
    paragraphs.push(shuffled.slice(0, sentCount).join(' '));
  }

  const result = document.getElementById('lorem-result');
  if (result) result.textContent = paragraphs.join('\n\n');
}

// 9. Color Palette
function generatePalette() {
  const base = document.getElementById('color-base')?.value || '#38bdf8';
  const container = document.getElementById('color-palette');
  if (!container) return;

  function hexToHsl(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }

  const [h, s, l] = hexToHsl(base);
  const colors = [
    `hsl(${h}, ${s}%, ${Math.min(l + 30, 95)}%)`,
    `hsl(${h}, ${s}%, ${Math.min(l + 15, 85)}%)`,
    `hsl(${h}, ${s}%, ${l}%)`,
    `hsl(${h}, ${s}%, ${Math.max(l - 15, 15)}%)`,
    `hsl(${h}, ${s}%, ${Math.max(l - 30, 5)}%)`,
    // Complementary
    `hsl(${(h + 180) % 360}, ${s}%, ${l}%)`,
    // Analogous
    `hsl(${(h + 30) % 360}, ${s}%, ${l}%)`,
    `hsl(${(h + 330) % 360}, ${s}%, ${l}%)`,
    // Triadic
    `hsl(${(h + 120) % 360}, ${s}%, ${l}%)`,
    `hsl(${(h + 240) % 360}, ${s}%, ${l}%)`,
  ];

  container.innerHTML = colors.map(c => `
    <div style="cursor:pointer" onclick="navigator.clipboard.writeText('${c}');showToast('Color copiado: ${c}')">
      <div style="height:60px;background:${c};border-radius:var(--radius-sm);border:1px solid var(--border-color)"></div>
      <p style="font-size:0.65rem;color:var(--text-muted);text-align:center;margin-top:0.3rem">${c}</p>
    </div>
  `).join('');
}

// 10. Loan Calculator
function calculateLoan() {
  const P = parseFloat(document.getElementById('loan-amount')?.value || '0');
  const annual = parseFloat(document.getElementById('loan-rate')?.value || '0');
  const n = parseInt(document.getElementById('loan-term')?.value || '0');
  const result = document.getElementById('loan-result');
  if (!result || !P || !n) return;

  const r = annual / 100 / 12;
  let monthly, totalPaid, totalInterest;

  if (r === 0) {
    monthly = P / n;
    totalPaid = P;
    totalInterest = 0;
  } else {
    monthly = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    totalPaid = monthly * n;
    totalInterest = totalPaid - P;
  }

  const fmt = (v) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(v);

  result.textContent = [
    `💰 Cuota mensual:   ${fmt(monthly)}`,
    `📊 Total a pagar:   ${fmt(totalPaid)}`,
    `📈 Total intereses: ${fmt(totalInterest)}`,
    `📅 Plazo:           ${n} meses (${(n / 12).toFixed(1)} años)`,
    `%  Tasa anual:      ${annual}%`,
  ].join('\n');
}

// 11. Timestamp Converter
function convertTimestamp() {
  const unix = parseInt(document.getElementById('ts-unix')?.value || '0');
  const result = document.getElementById('ts-result');
  if (!result) return;

  const date = new Date(unix * 1000);
  if (isNaN(date.getTime())) {
    result.textContent = '❌ Timestamp inválido';
    return;
  }

  result.textContent = [
    `📅 Local:  ${date.toLocaleString('es-DO')}`,
    `🌐 UTC:    ${date.toUTCString()}`,
    `📋 ISO:    ${date.toISOString()}`,
  ].join('\n');
}

function currentTimestamp() {
  const el = document.getElementById('ts-unix');
  if (el) el.value = Math.floor(Date.now() / 1000);
  convertTimestamp();
}

function dateToTimestamp() {
  const dateStr = document.getElementById('ts-date')?.value;
  const result = document.getElementById('ts-result2');
  if (!result || !dateStr) return;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    result.textContent = '❌ Fecha inválida';
    return;
  }
  result.textContent = `Timestamp Unix: ${Math.floor(date.getTime() / 1000)}`;
}

// 12. Hash Generator
async function generateHash() {
  const text = document.getElementById('hash-input')?.value || '';
  const algo = document.getElementById('hash-algo')?.value || 'SHA-256';
  const result = document.getElementById('hash-result');
  if (!result) return;

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest(algo, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    result.textContent = hashHex;
    result.style.color = 'var(--accent-cyan)';
  } catch (e) {
    result.textContent = '❌ Error: ' + e.message;
    result.style.color = 'var(--accent-red)';
  }
}
