/**
 * Three.js Advanced Effects for RENACE Tech
 * Creates immersive 3D scenes with particles, geometry, and advanced visual effects
 */

class ThreeEffects {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = [];
        this.mouse = { x: 0, y: 0 };
        this.init();
    }

    init() {
        // Check if Three.js is available
        if (typeof THREE === 'undefined') {
            console.warn('Three.js not loaded, falling back to canvas effects');
            return;
        }

        this.setupScene();
        this.createParticles();
        this.createLighting();
        this.setupEventListeners();
        this.animate();
    }

    setupScene() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x020617, 0.001);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 50;

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.domElement.style.position = 'fixed';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.zIndex = '0';
        this.renderer.domElement.style.pointerEvents = 'none';
        
        document.body.insertBefore(this.renderer.domElement, document.body.firstChild);
    }

    createParticles() {
        const particleCount = 2000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        const color1 = new THREE.Color(0x38bdf8); // Brand blue
        const color2 = new THREE.Color(0x818cf8); // Accent purple

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Position
            positions[i3] = (Math.random() - 0.5) * 200;
            positions[i3 + 1] = (Math.random() - 0.5) * 200;
            positions[i3 + 2] = (Math.random() - 0.5) * 200;

            // Color - gradient between brand colors
            const mixedColor = color1.clone().lerp(color2, Math.random());
            colors[i3] = mixedColor.r;
            colors[i3 + 1] = mixedColor.g;
            colors[i3 + 2] = mixedColor.b;

            // Size
            sizes[i] = Math.random() * 3 + 1;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // Shader material for advanced effects
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                mouse: { value: new THREE.Vector2(0, 0) }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                uniform float time;
                uniform vec2 mouse;
                
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    
                    // Mouse interaction
                    float dist = distance(mouse.xy, position.xy);
                    float force = 1.0 / (dist * 0.1 + 1.0);
                    mvPosition.z += force * 2.0;
                    
                    // Animation
                    mvPosition.x += sin(time + position.x * 0.01) * 2.0;
                    mvPosition.y += cos(time + position.y * 0.01) * 2.0;
                    
                    gl_Position = projectionMatrix * mvPosition;
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    float dist = distance(gl_PointCoord, vec2(0.5));
                    if (dist > 0.5) discard;
                    
                    float alpha = 1.0 - (dist * 2.0);
                    alpha *= 0.8;
                    
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    createLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        // Point lights for dramatic effect
        const light1 = new THREE.PointLight(0x38bdf8, 1, 100);
        light1.position.set(50, 50, 50);
        this.scene.add(light1);

        const light2 = new THREE.PointLight(0x818cf8, 1, 100);
        light2.position.set(-50, -50, -50);
        this.scene.add(light2);

        // Store lights for animation
        this.lights = [light1, light2];
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Update shader uniform
        if (this.particles.material.uniforms) {
            this.particles.material.uniforms.mouse.value.set(event.clientX, event.clientY);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const time = Date.now() * 0.001;

        // Update shader uniforms
        if (this.particles.material.uniforms) {
            this.particles.material.uniforms.time.value = time;
        }

        // Rotate particle system
        this.particles.rotation.x = time * 0.05;
        this.particles.rotation.y = time * 0.03;

        // Animate lights
        if (this.lights) {
            this.lights[0].position.x = Math.sin(time) * 50;
            this.lights[0].position.y = Math.cos(time) * 50;
            
            this.lights[1].position.x = Math.cos(time) * 50;
            this.lights[1].position.y = Math.sin(time) * 50;
        }

        // Camera parallax effect
        this.camera.position.x += (this.mouse.x * 5 - this.camera.position.x) * 0.05;
        this.camera.position.y += (this.mouse.y * 5 - this.camera.position.y) * 0.05;
        this.camera.lookAt(this.scene.position);

        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        if (this.renderer) {
            this.renderer.dispose();
            document.body.removeChild(this.renderer.domElement);
        }
    }
}

// Initialize when DOM is ready (solo en desktop / equipos potentes)
document.addEventListener('DOMContentLoaded', () => {
    const disableHeavyEffects = true;
    if (disableHeavyEffects) {
        return;
    }

    const isSmallScreen = window.innerWidth < 1024;
    const hasFinePointer = window.matchMedia && window.matchMedia('(pointer:fine)').matches;
    const cores = navigator.hardwareConcurrency || 2;
    const isLowCore = cores < 6;

    if (isSmallScreen || !hasFinePointer || isLowCore) {
        return;
    }

    window.threeEffects = new ThreeEffects();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.threeEffects) {
        window.threeEffects.destroy();
    }
});
