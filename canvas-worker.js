// Web Worker for Canvas Particle Calculations
// This offloads particle position updates from the main thread

let particles = [];
let width = 0;
let height = 0;

self.onmessage = function(e) {
    const { type, data } = e.data;

    switch(type) {
        case 'init':
            width = data.width;
            height = data.height;
            particles = initializeParticles(data.particleCount);
            self.postMessage({ type: 'initialized', particles });
            break;

        case 'update':
            particles = updateParticles(particles);
            self.postMessage({ type: 'updated', particles });
            break;

        case 'resize':
            width = data.width;
            height = data.height;
            // Reset particles that are out of bounds
            particles = particles.map(p => {
                if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
                    return createParticle();
                }
                return p;
            });
            self.postMessage({ type: 'resized', particles });
            break;
    }
};

function initializeParticles(count) {
    const newParticles = [];
    for (let i = 0; i < count; i++) {
        newParticles.push(createParticle());
    }
    return newParticles;
}

function createParticle() {
    // Ensure width and height are valid to prevent issues with Math.random() * 0
    const safeWidth = width > 0 ? width : 800;
    const safeHeight = height > 0 ? height : 600;
    
    return {
        x: Math.random() * safeWidth,
        y: Math.random() * safeHeight,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.2
    };
}

function updateParticles(particles) {
    return particles.map(particle => {
        let { x, y, vx, vy, size, alpha } = particle;

        // Update position
        x += vx;
        y += vy;

        // Reset particle if it goes out of bounds
        if (x < 0 || x > width || y < 0 || y > height) {
            return createParticle();
        }

        return { x, y, vx, vy, size, alpha };
    });
}
