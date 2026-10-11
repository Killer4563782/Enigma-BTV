import { useEffect, useRef } from 'react';

const FRAME_INTERVAL = 1000 / 30;
const TWO_PI = Math.PI * 2;

function createRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createNebula(width, height) {
  const surface = document.createElement('canvas');
  const scale = Math.min(0.7, 1000 / width, 700 / height);
  surface.width = Math.max(1, Math.ceil(width * scale));
  surface.height = Math.max(1, Math.ceil(height * scale));
  const context = surface.getContext('2d');
  if (!context) return surface;

  context.scale(surface.width, surface.height);
  context.globalCompositeOperation = 'screen';
  const random = createRandom(78291);

  // Build the expensive cloud field once. The live frame only moves its bitmap.
  for (let index = 0; index < 34; index += 1) {
    const position = index / 33;
    const x = 0.06 + position * 0.88 + (random() - 0.5) * 0.2;
    const y = 0.78 - position * 0.54 + (random() - 0.5) * 0.3;
    const radius = 0.07 + random() * 0.2;
    const blue = index % 6 === 0;
    const color = blue ? '73, 90, 191' : '103, 47, 168';
    const cloud = context.createRadialGradient(x, y, 0, x, y, radius);
    cloud.addColorStop(0, `rgba(${color}, ${0.035 + random() * 0.05})`);
    cloud.addColorStop(0.38, `rgba(${color}, 0.025)`);
    cloud.addColorStop(1, `rgba(${color}, 0)`);
    context.fillStyle = cloud;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  return surface;
}

function createStars(width, height) {
  const random = createRandom(47183);
  const count = Math.max(130, Math.min(340, Math.round((width * height) / 2500)));

  return Array.from({ length: count }, (_, index) => ({
    x: random(),
    y: random(),
    radius: 0.35 + random() ** 3 * 1.15,
    opacity: 0.15 + random() * 0.5,
    phase: random() * TWO_PI,
    speed: 0.22 + random() * 0.35,
    depth: 0.3 + random() * 0.7,
    violet: index % 5 === 0,
    bright: index % 43 === 0,
  }));
}

/** Decorative only; person nodes and their interactions live in the DOM. */
export default function ConstellationAtmosphere({ paused = false, active = true }) {
  const canvasRef = useRef(null);
  const controlsRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !context) return undefined;

    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let nebula = null;
    let stars = [];
    let animationFrame = null;
    let lastTimestamp = null;
    let lastPaint = 0;
    let elapsed = 0;
    let inView = true;
    let motionAllowed = false;
    let disposed = false;

    const canAnimate = () => motionAllowed && inView && !document.hidden && !disposed;

    function draw() {
      if (!width || !height || disposed) return;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.globalAlpha = 1;
      context.globalCompositeOperation = 'source-over';
      context.fillStyle = '#080711';
      context.fillRect(0, 0, width, height);

      if (nebula) {
        const driftX = Math.sin(elapsed * 0.045) * width * 0.012;
        const driftY = Math.cos(elapsed * 0.035) * height * 0.009;
        context.drawImage(nebula, -width * 0.05 + driftX, -height * 0.05 + driftY, width * 1.1, height * 1.1);
      }

      for (const star of stars) {
        const x = star.x * width + Math.sin(elapsed * 0.055 + star.phase) * star.depth * 3;
        const y = star.y * height + Math.cos(elapsed * 0.045 + star.phase) * star.depth * 2;
        const shimmer = 0.8 + Math.sin(elapsed * star.speed + star.phase) * 0.2;
        context.globalAlpha = star.opacity * shimmer;
        context.fillStyle = star.violet ? '#bca3f5' : '#e0dcf3';
        context.beginPath();
        context.arc(x, y, star.radius, 0, TWO_PI);
        context.fill();

        if (star.bright) {
          context.globalAlpha = star.opacity * shimmer * 0.19;
          context.fillRect(x - 3.5, y - 0.35, 7, 0.7);
          context.fillRect(x - 0.35, y - 3.5, 0.7, 7);
        }
      }

      // A brief meteor traverses the upper background, away from the focal planets.
      const meteorTime = (elapsed - 6) % 17;
      if (elapsed >= 6 && meteorTime >= 0 && meteorTime < 1.35) {
        const progress = meteorTime / 1.35;
        const cycle = Math.floor((elapsed - 6) / 17);
        const originX = width * (cycle % 2 === 0 ? 0.15 : 0.51);
        const originY = height * (cycle % 2 === 0 ? 0.12 : 0.04);
        const travel = Math.min(width * 0.31, 360);
        const x = originX + progress * travel;
        const y = originY + progress * travel * 0.38;
        const tail = Math.min(100, travel * 0.48);
        const trail = context.createLinearGradient(x - tail, y - tail * 0.38, x, y);
        trail.addColorStop(0, 'rgba(162, 133, 235, 0)');
        trail.addColorStop(0.8, 'rgba(194, 172, 255, 0.28)');
        trail.addColorStop(1, 'rgba(237, 226, 255, 0.9)');
        context.globalAlpha = Math.sin(progress * Math.PI) * 0.8;
        context.strokeStyle = trail;
        context.lineWidth = 1.1;
        context.lineCap = 'round';
        context.beginPath();
        context.moveTo(x - tail, y - tail * 0.38);
        context.lineTo(x, y);
        context.stroke();
      }

      context.globalAlpha = 1;
    }

    function tick(timestamp) {
      animationFrame = null;
      if (!canAnimate()) return;

      if (lastTimestamp !== null) elapsed += Math.min(timestamp - lastTimestamp, 100) / 1000;
      lastTimestamp = timestamp;

      if (timestamp - lastPaint >= FRAME_INTERVAL) {
        draw();
        lastPaint = timestamp;
      }

      animationFrame = window.requestAnimationFrame(tick);
    }

    function syncMotion() {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
      lastTimestamp = null;

      if (canAnimate()) animationFrame = window.requestAnimationFrame(tick);
      else if (inView && !document.hidden) draw();
    }

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      const nextWidth = Math.max(0, Math.round(bounds.width));
      const nextHeight = Math.max(0, Math.round(bounds.height));
      const nextRatio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(1500000 / Math.max(1, nextWidth * nextHeight)));
      if (nextWidth === width && nextHeight === height && nextRatio === pixelRatio) return;

      width = nextWidth;
      height = nextHeight;
      pixelRatio = nextRatio;
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      if (!width || !height) return;

      nebula = createNebula(width, height);
      stars = createStars(width, height);
      draw();
    }

    controlsRef.current = {
      setMotion(allowed) {
        motionAllowed = allowed;
        syncMotion();
      },
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncMotion();
    });
    intersectionObserver.observe(canvas);
    document.addEventListener('visibilitychange', syncMotion);
    window.addEventListener('resize', resize, { passive: true });
    resize();

    return () => {
      disposed = true;
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', syncMotion);
      window.removeEventListener('resize', resize);
      controlsRef.current = null;
      nebula = null;
    };
  }, []);

  useEffect(() => {
    controlsRef.current?.setMotion(active && !paused);
  }, [active, paused]);

  return <canvas ref={canvasRef} className="constellation-atmosphere" aria-hidden="true" />;
}
