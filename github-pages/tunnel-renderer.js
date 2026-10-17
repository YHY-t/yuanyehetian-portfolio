/* GPU curved-image renderer; cached Canvas surfaces also work on file://. */
(() => {
  'use strict';
  if (!window.TunnelProjection) return;
  const grid = window.TunnelProjection.createGrid();
  const vertex = `
    attribute vec2 a_uv;
    uniform vec2 u_viewport;
    uniform vec4 u_panel;
    varying vec2 v_uv;
    void main() {
      float theta = u_panel.x + (a_uv.x - .5) * u_panel.y;
      float r = u_panel.z * mix(1., u_panel.w, a_uv.y);
      gl_Position = vec4(2. * r * cos(theta) / u_viewport.x,
        -2. * r * sin(theta) / u_viewport.y, 0., 1.);
      v_uv = a_uv;
    }`;
  const fragment = `
    precision mediump float;
    uniform sampler2D u_image;
    uniform float u_opacity;
    uniform vec3 u_frame;
    varying vec2 v_uv;
    void main() {
      vec2 uv = (v_uv - .012) / .976;
      vec4 image = texture2D(u_image, vec2(uv.x, 1. - uv.y));
      float content = step(0., uv.x) * step(uv.x, 1.) * step(0., uv.y) * step(uv.y, 1.);
      vec4 color = mix(vec4(u_frame, 1.), image, content);
      gl_FragColor = vec4(color.rgb, color.a * u_opacity);
    }`;
  function canvasElement(kind) {
    const canvas = document.createElement('canvas');
    canvas.className = 'tunnel-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.dataset.renderer = kind;
    return canvas;
  }
  function createGPU(sources, onContextLost) {
    const canvas = canvasElement('webgl');
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true, depth: false, stencil: false });
    if (!gl) return null;
    const shaders = [], textures = [], buffers = [];
    let program = null;
    function dispose() {
      canvas.removeEventListener('webglcontextlost', lost);
      textures.forEach(texture => { if (texture) gl.deleteTexture(texture); });
      buffers.forEach(buffer => gl.deleteBuffer(buffer));
      shaders.forEach(shader => gl.deleteShader(shader));
      if (program) gl.deleteProgram(program);
    }
    function lost(event) { event.preventDefault(); onContextLost(); }
    try {
      for (const [type, code] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, code); gl.compileShader(shader); shaders.push(shader);
      }
      program = gl.createProgram();
      shaders.forEach(shader => gl.attachShader(program, shader));
      gl.bindAttribLocation(program, 0, 'a_uv'); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Curved surface program unavailable');
      gl.useProgram(program);
      const vertices = gl.createBuffer(), indices = gl.createBuffer();
      buffers.push(vertices, indices);
      gl.bindBuffer(gl.ARRAY_BUFFER, vertices); gl.bufferData(gl.ARRAY_BUFFER, grid.uv, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, grid.indices, gl.STATIC_DRAW);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      const maxTexture = Math.min(2048, gl.getParameter(gl.MAX_TEXTURE_SIZE));
      sources.forEach(({ image, crop }) => {
        if (!image.naturalWidth) { textures.push(null); return; }
        const texture = gl.createTexture(); textures.push(texture); gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        let source = image;
        const [sx, sy, sw, sh] = crop || [0, 0, image.naturalWidth, image.naturalHeight];
        const scale = Math.min(1, maxTexture / Math.max(sw, sh));
        if (crop || scale < 1) {
          source = document.createElement('canvas');
          source.width = Math.round(sw * scale); source.height = Math.round(sh * scale);
          source.getContext('2d').drawImage(image, sx, sy, sw, sh, 0, 0, source.width, source.height);
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      });
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      const viewport = gl.getUniformLocation(program, 'u_viewport'), panel = gl.getUniformLocation(program, 'u_panel');
      const opacity = gl.getUniformLocation(program, 'u_opacity'), frame = gl.getUniformLocation(program, 'u_frame');
      gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0);
      canvas.addEventListener('webglcontextlost', lost);
      return {
        canvas, dispose,
        resize(width, height, dpr) {
          canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
          gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(viewport, width, height);
        },
        draw(panels) {
          if (gl.isContextLost()) return;
          gl.clear(gl.COLOR_BUFFER_BIT);
          for (let i = panels.length - 1; i >= 0; i--) {
            const item = panels[i], texture = textures[item.sourceIndex];
            if (!texture || item.opacity <= .01) continue;
            gl.uniform4f(panel, item.angle, item.arcSpan, item.outer, item.innerRatio);
            gl.uniform1f(opacity, item.opacity);
            gl.uniform3fv(frame, sources[item.sourceIndex].website ? [.227, .349, .82] : [.09, .18, .31]);
            gl.bindTexture(gl.TEXTURE_2D, texture); gl.drawElements(gl.TRIANGLES, grid.indices.length, gl.UNSIGNED_SHORT, 0);
          }
        },
      };
    } catch { dispose(); return null; }
  }
  function sectorPath(context, outer, inner, half) {
    context.beginPath(); context.arc(0, 0, outer, -half, half);
    context.arc(0, 0, inner, half, -half, true); context.closePath();
  }
  // Bend each source once. Each scrolling frame then draws at most 14 bitmaps.
  function bendSource({ image, crop, arcSpan, innerRatio, website }) {
    if (!image.naturalWidth) return null;
    const outer = 1024, inner = outer * innerRatio, half = arcSpan / 2;
    const left = inner * Math.cos(half) - 2, top = -outer * Math.sin(half) - 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(outer - left + 2); canvas.height = Math.ceil(-top * 2);
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.translate(-left, -top); sectorPath(context, outer, inner, half);
    context.fillStyle = website ? '#3A59D1' : '#172e50'; context.fill(); context.clip();
    const [sx, sy, iw, ih] = crop || [0, 0, image.naturalWidth, image.naturalHeight];
    const point = index => {
      const u = grid.uv[index * 2], v = grid.uv[index * 2 + 1];
      const theta = (u * .976 + .012 - .5) * arcSpan, r = outer + (inner - outer) * (v * .976 + .012);
      return { x: r * Math.cos(theta), y: r * Math.sin(theta), u: sx + u * iw, v: sy + v * ih };
    };
    for (let i = 0; i < grid.indices.length; i += 3) {
      const [a, b, c] = [point(grid.indices[i]), point(grid.indices[i + 1]), point(grid.indices[i + 2])];
      const denominator = a.u * (b.v - c.v) + b.u * (c.v - a.v) + c.u * (a.v - b.v);
      const solve = key => [
        (a[key] * (b.v - c.v) + b[key] * (c.v - a.v) + c[key] * (a.v - b.v)) / denominator,
        (a[key] * (c.u - b.u) + b[key] * (a.u - c.u) + c[key] * (b.u - a.u)) / denominator,
        (a[key] * (b.u * c.v - c.u * b.v) + b[key] * (c.u * a.v - a.u * c.v) + c[key] * (a.u * b.v - b.u * a.v)) / denominator,
      ];
      const x = solve('x'), y = solve('y'), mx = (a.x + b.x + c.x) / 3, my = (a.y + b.y + c.y) / 3;
      context.save(); context.beginPath();
      [a, b, c].forEach((p, index) => {
        const amount = 1 + .35 / Math.hypot(p.x - mx, p.y - my);
        context[index ? 'lineTo' : 'moveTo'](mx + (p.x - mx) * amount, my + (p.y - my) * amount);
      });
      context.closePath(); context.clip(); context.transform(x[0], y[0], x[1], y[1], x[2], y[2]);
      context.drawImage(image, 0, 0); context.restore();
    }
    return { canvas, left, top, outer };
  }
  function createCanvas(sources) {
    const canvas = canvasElement('canvas2d'), context = canvas.getContext('2d');
    if (!context) return null;
    const cache = sources.map(bendSource);
    let width = 1, height = 1, dpr = 1;
    return {
      canvas, dispose() { cache.length = 0; },
      resize(w, h, ratio) {
        width = w; height = h; dpr = ratio; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      },
      draw(panels) {
        context.setTransform(dpr, 0, 0, dpr, 0, 0); context.clearRect(0, 0, width, height);
        for (let i = panels.length - 1; i >= 0; i--) {
          const item = panels[i], image = cache[item.sourceIndex];
          if (!image || item.opacity <= .01) continue;
          context.save(); context.globalAlpha = item.opacity; context.translate(width / 2, height / 2); context.rotate(item.angle);
          const scale = item.outer / image.outer;
          context.scale(scale, scale); context.drawImage(image.canvas, image.left, image.top); context.restore();
        }
      },
    };
  }
  window.TunnelRenderer = {
    create(sources, { forceCanvas = false, onContextLost = () => {} } = {}) {
      // File-origin textures are restricted by WebGL. Canvas draws them without
      // reading pixels, preserving the existing double-click/offline workflow.
      if (!forceCanvas && location.protocol !== 'file:') {
        try {
          const gpu = createGPU(sources, onContextLost);
          if (gpu) return gpu;
        } catch { /* A denied GPU context still has a Canvas drawing path. */ }
      }
      return createCanvas(sources);
    },
  };
})();
