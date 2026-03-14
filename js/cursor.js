/**
 * cursor.js - Optimized Custom Cursor Logic
 * Restores the original intended behavior with performance improvements.
 * Prevents "disappearing" issue by enforcing z-index and coordinate tracking.
 */

class CursorManager {
    constructor() {
        // Create cursor elements if they don't exist
        this.ensureCursorElements();

        this.cursor = document.querySelector('.custom-cursor');
        this.follower = document.querySelector('.cursor-follower');

        this.pos = { x: 0, y: 0 };
        this.mouse = { x: 0, y: 0 };
        this.speed = 0.15; // Smooth trailing speed

        this.init();
    }

    ensureCursorElements() {
        if (!document.querySelector('.custom-cursor')) {
            const cursor = document.createElement('div');
            cursor.classList.add('custom-cursor');
            document.body.appendChild(cursor);
        }
        if (!document.querySelector('.cursor-follower')) {
            const follower = document.createElement('div');
            follower.classList.add('cursor-follower');
            document.body.appendChild(follower);
        }
    }

    init() {
        // Initial visibility check
        this.cursor.style.opacity = 1;
        this.follower.style.opacity = 1;

        // Mouse movement
        document.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;

            // Instant update for the center dot (if visible) or main cursor
            this.cursor.style.transform = `translate3d(${this.mouse.x}px, ${this.mouse.y}px, 0)`;

            // Ensure visibility if it was hidden
            if (this.cursor.style.opacity === '0') {
                this.cursor.style.opacity = 1;
                this.follower.style.opacity = 1;
            }
        });

        // Click states
        document.addEventListener('mousedown', () => {
            this.cursor.classList.add('clicked');
            this.follower.classList.add('clicked');
        });

        document.addEventListener('mouseup', () => {
            this.cursor.classList.remove('clicked');
            this.follower.classList.remove('clicked');
        });

        // Hover states for interactive elements
        const interactiveElements = `
            a, button, input, textarea, [role="button"],
            .card, .pricing-card, .pricing-card-premium,
            .control, .terminal-btn, .tech-item, .service-card,
            .modern-nav .logo, .social-btn, .docker-item,
            .finder-item, .document-item, .file-item,
            .contact-form button, .form-group input, .form-group textarea,
            .terminal-controls, .menu-toggle, .nav-links a, .custom-plan-banner
        `;

        document.querySelectorAll(interactiveElements).forEach(el => {
            el.addEventListener('mouseenter', () => this.setHover(true));
            el.addEventListener('mouseleave', () => this.setHover(false));
        });

        // Global delegation for dynamic content (like the RAR tool)
        document.addEventListener('mouseover', (e) => {
            if (e.target.closest(interactiveElements)) {
                this.setHover(true);
            }
        });
        document.addEventListener('mouseout', (e) => {
            if (!e.target.closest(interactiveElements)) {
                this.setHover(false);
            }
        });

        // Start animation loop
        this.animate();
    }

    setHover(active) {
        if (active) {
            this.cursor.classList.add('hover');
            this.follower.classList.add('hover');
        } else {
            this.cursor.classList.remove('hover');
            this.follower.classList.remove('hover');
        }
    }

    animate() {
        // Smooth follower movement
        const dt = 1.0 - Math.pow(1.0 - this.speed, 2); // Frame-rate independent dampening approx

        this.pos.x += (this.mouse.x - this.pos.x) * dt;
        this.pos.y += (this.mouse.y - this.pos.y) * dt;

        this.follower.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0)`;

        requestAnimationFrame(() => this.animate());
    }
}

// Initialize
const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (window.matchMedia("(pointer: fine)").matches && !prefersReducedMotion) {
    document.addEventListener('DOMContentLoaded', () => {
        new CursorManager();
        document.body.style.cursor = 'none';
    });
} else {
    document.body.style.cursor = 'auto';
}
