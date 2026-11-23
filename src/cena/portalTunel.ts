// A boca do túnel na página (src/site/Trajetoria.tsx): o túnel continua para fora do furo. Em volta do círculo, as mesmas
// costelas do túnel (anéis finos, em perspectiva, com um azul forte a cada quatro) seguem pela página e são sugadas para
// dentro, com riscos de velocidade que correm para o centro e um aro fino e claro na borda. É o que o visitante vai ver
// logo depois, lá dentro: nada de outro desenho. O interior do círculo é o túnel de verdade, por baixo.
// Tudo é traço fino com borda suave calculada por pixel e a resolução é a da tela, para ficar nítido.

const VERTICE = /* glsl */ `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const FRAGMENTO = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec2 uC;
uniform float uR;
uniform float uT;
uniform float uA;
uniform float uM;   // raio em que o túnel de verdade começa, em unidades do furo (0..1)
out vec4 saida;

float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 q = (px - uC) / uR;                 // 1 = a borda do furo
  float r = length(q);
  bool dentro = r < 0.985;
  // dentro do furo, entre a borda e o túnel de verdade, as costelas continuam: o furo e o túnel são uma entrada só
  if (r > 7.0 || (dentro && (r < uM || uM >= 0.985))) { saida = vec4(0.0); return; }

  // costelas: espaçamento geométrico (como o túnel em perspectiva), fluindo para dentro
  float L = log(1.2);
  float u = log(r) / L + uT * 0.35;
  float fr = abs(fract(u + 0.5) - 0.5);
  float pxu = 1.0 / (r * uR * L);            // 1 pixel, em unidades de u
  float lw = 0.75 * pxu;
  float anel = 1.0 - smoothstep(lw, lw + pxu * 1.3, fr);
  float idx = floor(u + 0.5);
  float forte = step(mod(idx, 4.0), 0.5);
  float queda = dentro ? 0.85 * smoothstep(uM, uM * 1.25, r) : exp(-(r - 1.0) * 0.5);
  vec3 cinza = vec3(0.55, 0.6, 0.9);
  vec3 azul = vec3(0.18, 0.32, 1.0);
  vec3 corAnel = mix(cinza * 0.6, azul * 1.5, forte);
  float aneis = anel * queda * mix(0.5, 1.0, forte);

  // aro da borda: fino e claro, com uma luz azul que escorre para fora
  float aro = dentro ? 0.0 : exp(-pow((r - 1.0) * uR / 1.4, 2.0));
  float luz = dentro ? 0.0 : exp(-(r - 1.0) * 6.0) * 0.32;

  // riscos de velocidade correndo para o centro
  float ang = atan(q.y, q.x);
  float N = 84.0;
  float s = ang / 6.2831853 * N;
  float id = floor(s);
  float f = fract(s) - 0.5;
  float hs = h(vec2(id, 3.7));
  float aw = (0.55 / (r * uR)) * N / 6.2831853;
  float risco = 1.0 - smoothstep(aw, aw * 2.4, abs(f));
  float fase = fract(hs * 9.0 + uT * 0.5 * (0.5 + hs) + (1.0 / r) * 0.5);
  float pulso = smoothstep(0.0, 0.08, fase) * (1.0 - smoothstep(0.08, 0.4, fase));
  float rastros = dentro ? 0.0 : risco * step(0.5, hs) * pulso * smoothstep(1.02, 1.25, r) * exp(-(r - 1.0) * 0.6);

  vec3 col = corAnel * aneis + vec3(0.88, 0.94, 1.0) * aro * 1.3 + azul * luz + vec3(0.82, 0.9, 1.0) * rastros * 1.2;
  float a = clamp(max(max(aneis, aro), max(luz, rastros)), 0.0, 1.0);
  saida = vec4(col * uA, a * uA);
}`

export function iniciarPortal(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true })
  if (!gl || gl.isContextLost()) return null
  const compilar = (tipo: number, src: string) => {
    const sh = gl.createShader(tipo)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    return sh
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, compilar(gl.VERTEX_SHADER, VERTICE))
  gl.attachShader(prog, compilar(gl.FRAGMENT_SHADER, FRAGMENTO))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('portal:', gl.getProgramInfoLog(prog))
    return null
  }
  const vao = gl.createVertexArray()
  const u = (nome: string) => gl.getUniformLocation(prog, nome)
  const uRes = u('uRes')
  const uC = u('uC')
  const uR = u('uR')
  const uT = u('uT')
  const uA = u('uA')
  const uM = u('uM')
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

  return {
    /** W, H, centro e raio do furo em px de tela; `visivel` de 0 a 1; `t` em segundos; `boca`: raio do túnel / raio do furo */
    desenhar(W: number, H: number, cx: number, cy: number, R: number, visivel: number, t: number, boca: number) {
      // na resolução da tela (até 1,5x): traço fino precisa de pixel de verdade
      const e = Math.min(window.devicePixelRatio || 1, 1.5)
      const w = Math.max(2, Math.round(W * e))
      const h = Math.max(2, Math.round(H * e))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      gl.viewport(0, 0, w, h)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      if (visivel <= 0.001) return
      gl.useProgram(prog)
      gl.bindVertexArray(vao)
      gl.uniform2f(uRes, w, h)
      gl.uniform2f(uC, cx * e, cy * e)
      gl.uniform1f(uR, R * e)
      gl.uniform1f(uT, t)
      gl.uniform1f(uA, visivel)
      gl.uniform1f(uM, boca)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    destruir() {
      gl.deleteProgram(prog)
      gl.deleteVertexArray(vao)
    },
  }
}
