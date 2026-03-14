document.addEventListener('DOMContentLoaded', () => {
    const rarToolBtn = document.getElementById('rar-tool-btn');
    const documentsList = document.getElementById('documents-list');
    const rarView = document.getElementById('rar-view');

    if (rarToolBtn) {
        rarToolBtn.addEventListener('click', () => {
            // Activar visualmente el item seleccionado
            document.querySelectorAll('.finder-sidebar-item').forEach(i => i.classList.remove('active'));
            rarToolBtn.classList.add('active');

            renderRarExtractor();
        });
    }

    function renderRarExtractor() {
        const target = rarView || documentsList;
        if (!target) return;

        target.innerHTML = `
            <div class="rar-extractor-container fade-in-element">
                <div class="extractor-header">
                    <h3><i class="fas fa-file-archive"></i> Descompresor de Archivos</h3>
                    <p>Descomprime .RAR, .ZIP y .7Z directamente en tu navegador. Tus archivos no se suben a ningún servidor.</p>
                </div>
                
                <div class="drop-zone" id="drop-zone">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Arrastra tu archivo aquí o haz clic para seleccionar</p>
                    <input type="file" id="file-input" accept=".rar,.zip,.7z,.tar" style="display: none;">
                    <button class="btn-primary" onclick="document.getElementById('file-input').click()">Seleccionar Archivo</button>
                </div>

                <div id="extraction-status" class="extraction-status" style="display: none;">
                    <i class="fas fa-spinner fa-spin"></i> Procesando archivo...
                </div>

                <div id="extraction-results" class="extraction-results"></div>
            </div>
            
            <style>
                .rar-extractor-container {
                    padding: 2rem;
                    text-align: center;
                    color: var(--text-color);
                }
                .extractor-header {
                    margin-bottom: 2rem;
                }
                .extractor-header h3 {
                    margin-bottom: 0.5rem;
                    color: var(--primary-color);
                }
                .drop-zone {
                    border: 2px dashed var(--border-color);
                    border-radius: 12px;
                    padding: 3rem;
                    background: rgba(255, 255, 255, 0.05);
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                .drop-zone:hover, .drop-zone.dragover {
                    border-color: var(--primary-color);
                    background: rgba(var(--primary-rgb), 0.1);
                }
                .drop-zone i {
                    font-size: 3rem;
                    color: var(--text-muted);
                    margin-bottom: 1rem;
                }
                .extraction-results {
                    margin-top: 2rem;
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                    gap: 1rem;
                }
                .extracted-file {
                    background: var(--bg-card);
                    padding: 1rem;
                    border-radius: 8px;
                    text-align: center;
                    border: 1px solid var(--border-color);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                }
                .extracted-file i {
                    font-size: 2rem;
                    color: var(--secondary-color);
                }
                .extracted-file span {
                    font-size: 0.9rem;
                    word-break: break-all;
                }
                .download-link {
                    font-size: 0.8rem;
                    color: var(--primary-color);
                    text-decoration: none;
                    margin-top: auto;
                }
                .extraction-status {
                    margin-top: 1rem;
                    color: var(--text-muted);
                }
            </style>
        `;

        setupDropZone();
    }

    window.renderRarExtractor = renderRarExtractor;

    function setupDropZone() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');

        if (!dropZone || !fileInput) return;

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) processFile(files[0]);
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) processFile(e.target.files[0]);
        });
    }

    function ensureArchiveLoaded() {
        if (window.Archive) {
            return Promise.resolve(true);
        }

        if (window.__archiveLoader) {
            return window.__archiveLoader;
        }

        window.__archiveLoader = new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-archive]');
            if (existing) {
                existing.addEventListener('load', () => resolve(true), { once: true });
                existing.addEventListener('error', () => reject(new Error('archive_load')), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/libarchive.js@1.3.0/dist/libarchive.js';
            script.async = true;
            script.dataset.archive = '1';
            script.onload = () => resolve(true);
            script.onerror = () => reject(new Error('archive_load'));
            document.head.appendChild(script);
        });

        return window.__archiveLoader;
    }

    async function processFile(file) {
        const status = document.getElementById('extraction-status');
        const results = document.getElementById('extraction-results');

        try {
            await ensureArchiveLoaded();
        } catch (e) {
            alert('La librería de descompresión no está disponible en este momento.');
            return;
        }

        // Configurar Worker si no se ha hecho (necesario para libarchive.js)
        if (!Archive.isInitialized) {
            Archive.init({
                workerUrl: 'https://cdn.jsdelivr.net/npm/libarchive.js@1.3.0/dist/worker-bundle.js'
            });
            Archive.isInitialized = true;
        }

        try {
            status.style.display = 'block';
            results.innerHTML = '';

            const archive = await Archive.open(file);
            const extractedFiles = await archive.extractFiles();

            status.style.display = 'none';

            Object.keys(extractedFiles).forEach(fileName => {
                const fileData = extractedFiles[fileName];
                renderExtractedFile(fileName, fileData, results);
            });

        } catch (err) {
            console.error(err);
            status.innerText = 'Error al procesar el archivo: ' + err.message;
            status.style.color = '#ef4444';
        }
    }

    function renderExtractedFile(fileName, fileData, container) {
        // fileData puede ser un File object o un objeto anidado (carpetas)
        // Para simplificar, si es File object lo mostramos, si es objeto iteramos (recursivo simple)

        if (fileData instanceof File || fileData instanceof Blob) {
            const url = URL.createObjectURL(fileData);

            const div = document.createElement('div');
            div.className = 'extracted-file animate-fade-in';
            div.innerHTML = `
                <i class="fas fa-file"></i>
                <span>${fileName}</span>
                <a href="${url}" download="${fileName}" class="download-link">
                    <i class="fas fa-download"></i> Descargar
                </a>
            `;
            container.appendChild(div);
        } else if (typeof fileData === 'object') {
            // Es una carpeta
            Object.keys(fileData).forEach(subName => {
                renderExtractedFile(`${fileName}/${subName}`, fileData[subName], container);
            });
        }
    }
});
