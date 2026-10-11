import { useEffect, useRef } from 'react';

export default function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let scale = 1;

    let W = window.innerWidth;
    let H = window.innerHeight;

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      scale = Math.min(1, Math.sqrt(1500000 / Math.max(1, W * H)));
      canvas.width = Math.round(W * scale);
      canvas.height = Math.round(H * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // ── Colour palette: deep purples, blues, occasional pink ──
    const COLORS = [
      [120, 50, 255],   // vivid purple
      [80, 0, 200],     // deep violet
      [60, 120, 255],   // blue-purple
      [180, 60, 255],   // bright purple
      [220, 80, 255],   // pink-purple (rare)
    ];
    const rndColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

    // Cache soft gradients as tiny bitmaps instead of allocating them every frame.
    const glows = COLORS.map(([r, g, b]) => {
      const surface = document.createElement('canvas');
      surface.width = surface.height = 128;
      const context = surface.getContext('2d');
      const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, `rgba(${r},${g},${b},1)`);
      gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
      return surface;
    });

    // ── Star particles (constellation nodes) ──
    const STAR_COUNT = Math.min(64, Math.max(28, Math.round(W * H / 22000)));
    const stars = Array.from({ length: STAR_COUNT }, () => {
      const color = rndColor();
      const [r, g, b] = color;
      return {
        x:     Math.random() * W,
        y:     Math.random() * H,
        r:     Math.random() * 1.6 + 0.3,
        vx:    (Math.random() - 0.5) * 0.14,
        vy:    (Math.random() - 0.5) * 0.10,
        alpha: Math.random() * 0.55 + 0.15,
        pulse: Math.random() * Math.PI * 2, // phase offset
        cr: r, cg: g, cb: b, glow: glows[COLORS.indexOf(color)],
      };
    });

    // ── Nebula blobs (large soft glows) ──
    const NEBULA_COUNT = 5;
    const nebulae = Array.from({ length: NEBULA_COUNT }, () => {
      const color = rndColor();
      const [r, g, b] = color;
      return {
        x:     Math.random() * W,
        y:     Math.random() * H,
        radius: Math.random() * 200 + 120,
        alpha:  Math.random() * 0.04 + 0.015,
        vx:    (Math.random() - 0.5) * 0.06,
        vy:    (Math.random() - 0.5) * 0.04,
        cr: r, cg: g, cb: b, glow: glows[COLORS.indexOf(color)],
      };
    });

    // ── Comets (rare streaking particles) ──
    const MAX_COMETS = 2;
    const comets = [];
    const spawnComet = () => {
      if (comets.length >= MAX_COMETS) return;
      const fromTop = Math.random() < 0.5;
      const color = rndColor();
      const [r, g, b] = color;
      comets.push({
        x:    fromTop ? Math.random() * W : -40,
        y:    fromTop ? -40 : Math.random() * H * 0.6,
        vx:   Math.random() * 2.5 + 1.5,
        vy:   fromTop ? Math.random() * 1.5 + 0.8 : (Math.random() - 0.5) * 0.5,
        len:  Math.random() * 80 + 60,
        alpha: Math.random() * 0.5 + 0.3,
        cr: r, cg: g, cb: b,
        life:  0,
      });
    };

    // ── Connection distance threshold ──
    const LINK_DIST = 140;

    let frame = 0;
    let rafId;
    let lastPaint = 0;

    const draw = (timestamp = 0) => {
      rafId = undefined;
      if (document.hidden || motion.matches) return;
      if (timestamp - lastPaint < 1000 / 30) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      lastPaint = timestamp;
      frame++;
      ctx.clearRect(0, 0, W, H);

      // ── Nebula blobs ──
      nebulae.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -n.radius) n.x = W + n.radius;
        if (n.x > W + n.radius) n.x = -n.radius;
        if (n.y < -n.radius) n.y = H + n.radius;
        if (n.y > H + n.radius) n.y = -n.radius;

        ctx.globalAlpha = n.alpha;
        ctx.drawImage(n.glow, n.x - n.radius, n.y - n.radius, n.radius * 2, n.radius * 2);
        ctx.globalAlpha = 1;
      });

      // ── Constellation lines ──
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const a = stars[i], b = stars[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared < LINK_DIST * LINK_DIST) {
            const dist = Math.sqrt(distanceSquared);
            const opacity = (1 - dist / LINK_DIST) * 0.12;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${a.cr},${a.cg},${a.cb},${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // ── Stars ──
      stars.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.018;

        if (p.x < -5) p.x = W + 5;
        if (p.x > W + 5) p.x = -5;
        if (p.y < -5) p.y = H + 5;
        if (p.y > H + 5) p.y = -5;

        const pulse = 0.75 + 0.25 * Math.sin(p.pulse);
        const a = p.alpha * pulse;

        // Soft glow halo
        const radius = p.r * 3.5;
        ctx.globalAlpha = a * 0.5;
        ctx.drawImage(p.glow, p.x - radius, p.y - radius, radius * 2, radius * 2);
        ctx.globalAlpha = 1;

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.cr},${p.cg},${p.cb},${a})`;
        ctx.fill();
      });

      // ── Comets ──
      if (frame % 140 === 0) spawnComet();

      for (let i = comets.length - 1; i >= 0; i--) {
        const c = comets[i];
        c.x += c.vx;
        c.y += c.vy;
        c.life += 0.012;

        if (c.x > W + 100 || c.y > H + 100 || c.life > 1) {
          comets.splice(i, 1);
          continue;
        }

        const fade = c.alpha * Math.sin(c.life * Math.PI);
        const tailX = c.x - (c.vx / Math.hypot(c.vx, c.vy)) * c.len;
        const tailY = c.y - (c.vy / Math.hypot(c.vx, c.vy)) * c.len;

        const grad = ctx.createLinearGradient(tailX, tailY, c.x, c.y);
        grad.addColorStop(0, `rgba(${c.cr},${c.cg},${c.cb},0)`);
        grad.addColorStop(1, `rgba(${c.cr},${c.cg},${c.cb},${fade})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(c.x, c.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Comet head glow
        ctx.beginPath();
        ctx.arc(c.x, c.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.cr},${c.cg},${c.cb},${fade})`;
        ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    };
    const sync = () => {
      cancelAnimationFrame(rafId);
      lastPaint = 0;
      if (!document.hidden && !motion.matches) rafId = requestAnimationFrame(draw);
    };
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', sync);
    sync();

    return () => {
      document.removeEventListener('visibilitychange', sync);
      motion.removeEventListener('change', sync);
      canvas.width = canvas.height = 1;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} id="particleCanvas" />;
}
