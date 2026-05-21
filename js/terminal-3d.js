// Terminal 3D effect for the main hero terminal
// Uses Three.js already loaded in index.html

(function () {
    if (typeof THREE === 'undefined') return;

    function initHeroTerminal3D() {
        const container = document.getElementById('terminal-3d-container');
        if (!container) return;

        const width = container.clientWidth || 600;
        const height = container.clientHeight || 260;

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x0a0a2a, 0.02);

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(0, 0, 18);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xaaccff, 1);
        dirLight.position.set(5, 10, 7);
        dirLight.castShadow = true;
        scene.add(dirLight);

        const backLight = new THREE.PointLight(0xff00ff, 0.7, 25);
        backLight.position.set(-5, 2, -10);
        scene.add(backLight);

        const screenLight = new THREE.PointLight(0x00ffff, 0.5, 25);
        screenLight.position.set(0, -5, 5);
        scene.add(screenLight);

        // Background sphere
        const sphereGeo = new THREE.SphereGeometry(50, 60, 40);
        sphereGeo.scale(-1, 1, 1);
        const loader = new THREE.TextureLoader();
        const envTexture = loader.load(
            'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop'
        );
        const sphereMat = new THREE.MeshBasicMaterial({ map: envTexture });
        const backgroundSphere = new THREE.Mesh(sphereGeo, sphereMat);
        scene.add(backgroundSphere);

        // Canvas texture for terminal screen
        function createTerminalTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 768;
            const ctx = canvas.getContext('2d');

            // Background
            ctx.fillStyle = '#1e1e1e';
            ctx.fillRect(0, 0, 1024, 768);

            // Header bar
            ctx.fillStyle = '#2d2d2d';
            ctx.fillRect(0, 0, 1024, 60);

            ctx.fillStyle = '#3a3a3a';
            ctx.fillRect(0, 60, 1024, 2);

            function drawCircle(x, color) {
                ctx.beginPath();
                ctx.arc(x, 30, 10, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
            }
            drawCircle(35, '#ff5f56');
            drawCircle(75, '#ffbd2e');
            drawCircle(115, '#27c93f');

            // Title
            ctx.fillStyle = '#888';
            ctx.font = '24px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('renace@terminal: ~/digitalizacion-empresarial', 512, 38);

            // Terminal text
            ctx.fillStyle = '#33ff33';
            ctx.font = '28px "Fira Code", monospace';
            ctx.textAlign = 'left';

            const lines = [
                '> connect_renace_ai.sh',
                '[OK] Asistente RENACE AI conectado',
                '[INFO] Sincronizando catálogo de Odoo...',
                '[INFO] Preparando automatización de procesos...',
                '> acceso concedido',
                '',
                'renace@terminal $ _'
            ];

            let y = 120;
            for (const line of lines) {
                ctx.fillText(line, 30, y);
                y += 45;
            }

            return new THREE.CanvasTexture(canvas);
        }

        const terminalGroup = new THREE.Group();

        const boxGeometry = new THREE.BoxGeometry(10, 7, 0.3);
        const darkMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.2,
            metalness: 0.9
        });

        const screenTexture = createTerminalTexture();
        const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture });

        const materials = [
            darkMaterial,
            darkMaterial,
            darkMaterial,
            darkMaterial,
            screenMaterial,
            darkMaterial
        ];

        const terminalMesh = new THREE.Mesh(boxGeometry, materials);
        terminalMesh.castShadow = true;
        terminalMesh.receiveShadow = true;
        terminalGroup.add(terminalMesh);

        scene.add(terminalGroup);
        terminalGroup.position.x = 1.5;

        // Mouse-based subtle rotation
        let targetRotX = 0;
        let targetRotY = 0;

        container.addEventListener('mousemove', (event) => {
            const rect = container.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - 0.5;
            const y = (event.clientY - rect.top) / rect.height - 0.5;
            targetRotY = x * 0.4;
            targetRotX = -y * 0.3;
        });

        const clock = new THREE.Clock();

        function onResize() {
            const newWidth = container.clientWidth || width;
            const newHeight = container.clientHeight || height;
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
        }

        window.addEventListener('resize', onResize);

        function animate() {
            requestAnimationFrame(animate);
            const time = clock.getElapsedTime();

            // Floating animation
            terminalGroup.position.y = Math.sin(time * 0.8) * 0.3;

            // Smooth rotation interpolation
            terminalGroup.rotation.y += (targetRotY - terminalGroup.rotation.y) * 0.08;
            terminalGroup.rotation.x += (targetRotX - terminalGroup.rotation.x) * 0.08;

            renderer.render(scene, camera);
        }

        animate();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeroTerminal3D);
    } else {
        initHeroTerminal3D();
    }
})();
