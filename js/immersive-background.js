/**
 * Immersive Canvas Effects for RENACE Tech
 * Creates a 3D particle network with depth, mouse interaction, and scroll parallax.
 */

class ImmersiveBackground {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'immersive-canvas';
        this.ctx = this.canvas.getContext('2d');
        
        // Configuration - Optimized for performance
        this.config = {
            particleCount: window.innerWidth < 768 ? 40 : 80, // Reduced particle count significantly
            connectionDistance: 100,
            mouseDistance: 150,
            depth: 800, // Z-depth simulation
            color: { r: 46, g: 139, b: 195 } // Brand Blue
        };

        this.particles = [];
        this.mouse = { x: 0, y: 0, z: 0 };
        this.scroll = 0;
        this.targetScroll = 0;

        this.init();
    }

    init() {
        // Setup Canvas
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '0'; /* Changed from -1 to 0 to sit above body bg but below content */
        this.canvas.style.pointerEvents = 'none'; // Let clicks pass through
        this.canvas.style.background = 'radial-gradient(circle at center, #0a192f 0%, #02060b 100%)'; // Deep space bg
        
        document.body.insertBefore(this.canvas, document.body.firstChild);

        // Event Listeners
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('scroll', () => this.onScroll());

        // Initial Resize
        this.resize();

        // Create Particles
        this.createParticles();

        // Start Loop
        this.animate();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
    }

    createParticles() {
        this.particles = [];
        for (let i = 0; i < this.config.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.width - this.centerX,
                y: Math.random() * this.height - this.centerY,
                z: Math.random() * this.config.depth,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                vz: (Math.random() - 0.5) * 1.5
            });
        }
    }

    onMouseMove(e) {
        this.mouse.x = e.clientX - this.centerX;
        this.mouse.y = e.clientY - this.centerY;
    }

    onScroll() {
        this.targetScroll = window.scrollY * 0.5;
    }

    animate() {
        // Smooth scroll interpolation
        this.scroll += (this.targetScroll - this.scroll) * 0.1;

        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Calculate perspective
        const fov = 600;
        
        // Update and Draw Particles
        this.particles.forEach(p => {
            // Movement
            p.z -= 0.5; // Constant forward movement
            p.x += p.vx;
            p.y += p.vy;

            // Reset if behind camera or too far
            if (p.z < 1) {
                p.z = this.config.depth;
                p.x = (Math.random() * this.width - this.centerX) * 2;
                p.y = (Math.random() * this.height - this.centerY) * 2;
            }

            // Interactive Mouse Effect (Repulsion/Attraction in 3D)
            const dx = p.x - this.mouse.x;
            const dy = p.y - this.mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < this.config.mouseDistance) {
                const force = (this.config.mouseDistance - dist) / this.config.mouseDistance;
                p.x += dx * force * 0.05;
                p.y += dy * force * 0.05;
            }

            // Apply Scroll Rotation (rotate world around X axis)
            const scrollAngle = this.scroll * 0.001;
            const y_rot = p.y * Math.cos(scrollAngle) - p.z * Math.sin(scrollAngle);
            const z_rot = p.y * Math.sin(scrollAngle) + p.z * Math.cos(scrollAngle);

            // 3D Projection
            const scale = fov / (fov + z_rot);
            const x2d = p.x * scale + this.centerX;
            const y2d = y_rot * scale + this.centerY;

            // Draw Particle
            const alpha = Math.min(1, (this.config.depth - z_rot) / (this.config.depth * 0.8)); // Fade distant
            const size = Math.max(0.5, 3 * scale);

            if (z_rot > 0 && x2d > 0 && x2d < this.width && y2d > 0 && y2d < this.height) {
                this.ctx.beginPath();
                this.ctx.fillStyle = `rgba(${this.config.color.r}, ${this.config.color.g}, ${this.config.color.b}, ${alpha})`;
                this.ctx.arc(x2d, y2d, size, 0, Math.PI * 2);
                this.ctx.fill();

                // Connections (Neural Network) - Optimized to run only every other frame or with stricter limits
                // Only connect close particles to avoid performance hit
                // SKIP connections for better performance if needed or reduce radius
                /* 
                this.particles.forEach(p2 => {
                    if (p === p2) return;
                    // Simplified distance check for performance
                    const y_rot2 = p2.y * Math.cos(scrollAngle) - p2.z * Math.sin(scrollAngle);
                    const z_rot2 = p2.y * Math.sin(scrollAngle) + p2.z * Math.cos(scrollAngle);
                    
                    if (Math.abs(z_rot - z_rot2) > 50) return; // Optimization

                    const scale2 = fov / (fov + z_rot2);
                    const x2d2 = p2.x * scale2 + this.centerX;
                    const y2d2 = y_rot2 * scale2 + this.centerY;

                    const dist2d = Math.hypot(x2d - x2d2, y2d - y2d2);

                    if (dist2d < this.config.connectionDistance) {
                        const opacity = (1 - dist2d / this.config.connectionDistance) * alpha * 0.5;
                        this.ctx.beginPath();
                        this.ctx.strokeStyle = `rgba(${this.config.color.r}, ${this.config.color.g}, ${this.config.color.b}, ${opacity})`;
                        this.ctx.lineWidth = 0.5;
                        this.ctx.moveTo(x2d, y2d);
                        this.ctx.lineTo(x2d2, y2d2);
                        this.ctx.stroke();
                    }
                });
                */
            }
        });

        requestAnimationFrame(() => this.animate());
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
    const prefersReducedMotion =
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);

    if (isSmallScreen || !hasFinePointer || isLowCore || prefersReducedMotion || isTouchDevice) {
        return;
    }

    new ImmersiveBackground();
});
