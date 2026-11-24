// Shader da tela de abertura (src/site/Abertura.tsx): close extremo do olho robótico do retrato, uma íris mecânica
// desenhada inteira na placa de vídeo (moldura de aço escovado, anel de calibração com o progresso real, fibras com
// relevo, núcleo emissivo, diafragma de oito lâminas, córnea), a interface fina em volta, poeira, grão e vinheta.
// A câmera recua ancorada no olho até a foto ficar no enquadramento do topo do site.

export const VERTICE = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`

export const FRAGMENTO = `#version 300 es
precision highp float;
uniform vec2 uRes;      // canvas em px do aparelho
uniform float uDpr;
uniform float uT;
uniform float uZ;       // zoom da câmera (1 = enquadramento do topo do site)
uniform vec2 uE;        // centro do olho na tela (px css, com z = 1)
uniform float uEr;      // raio do olho na tela (px css, com z = 1)
uniform vec4 uR;        // retângulo da foto na tela (px css)
uniform sampler2D uFoto;
uniform sampler2D uAura;  // a silhueta do corpo, de onde saem as curvas de nível do retrato
uniform vec2 uOlhar;    // para onde olha (-1 a 1)
uniform float uHud, uLiga, uCal, uProg, uPupila, uFlash, uSala, uIris, uPerto;
uniform float uFase;    // relógio compartilhado com o retrato do topo (fase das curvas de nível)
uniform float uGlitch;  // 0 a 1: rajada de glitch (fatias deslocadas, faixas azuis, linhas)
uniform float uSemente; // sorteio do glitch, novo a cada quadro da rajada
out vec4 saida;
#define PI 3.14159265
#define TAU 6.2831853

// o relevo do rosto no retrato do topo (cópia do vertex shader de src/cena/Retrato.tsx): cabeça como cúpula, tronco e pescoço.
// f: coordenadas da foto, y para cima. O herói empurra o plano para a câmera por esse relevo, o que aumenta o rosto em ~5 %
const float RELEVO = 0.4689;
float relevoFoto(vec2 f) {
  vec2 c = (f - vec2(0.5, 0.71)) / vec2(0.25, 0.27);
  float cabeca = sqrt(max(0.0, 1.0 - dot(c, c)));
  vec2 t = (f - vec2(0.5, 0.0)) / vec2(0.62, 0.46);
  float tronco = sqrt(max(0.0, 1.0 - dot(t, t))) * 0.55;
  vec2 pp = (f - vec2(0.5, 0.47)) / vec2(0.11, 0.12);
  float pescoco = sqrt(max(0.0, 1.0 - dot(pp, pp))) * 0.7;
  return max(max(cabeca, tronco), pescoco);
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ruido(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
// faixa radial com borda suave do tamanho de um pixel
float faixa(float r, float a, float b, float px) { return smoothstep(a - px, a + px, r) * (1.0 - smoothstep(b - px, b + px, r)); }
float linha(float d, float px) { return 1.0 - smoothstep(0.0, px, abs(d)); }

// a íris: q em unidades do olho (r = 1 é a borda da moldura). Devolve cor (rgb) e cobertura (a).
vec4 iris(vec2 q, float px) {
  // camadas em profundidades diferentes deslizam com o olhar (paralaxe): de perto parece uma peça com volume
  vec2 qf = q - uOlhar * 0.05;   // fundo (lâminas)
  vec2 qm = q - uOlhar * 0.025;  // meio (fibras)
  float r = length(q), a = atan(q.y, q.x);
  float rf = length(qf), af = atan(qf.y, qf.x);
  float rm = length(qm), am = atan(qm.y, qm.x);
  vec3 cor = vec3(0.0);
  float cob = smoothstep(1.0 + px, 1.0 - px, r);
  float m = px * 3.0 + 0.012; // margem das camadas (as bordas suaves têm o tamanho de um pixel)
  vec3 azul = vec3(0.07, 0.19, 1.0), aco = vec3(0.10, 0.12, 0.17), acoClaro = vec3(0.55, 0.6, 0.72);
  vec2 L = normalize(vec2(-0.55, 0.83)); // luz de cima à esquerda

  // 1. moldura de aço (0,86 a 1): gravação de 120 marcas, dois frisos e o brilho da luz na borda
  if (r > 0.84 - m && r < 1.02 + m) {
  float mold = faixa(r, 0.86, 1.0, px);
  float n = dot(normalize(q), L);
  // aço escovado em círculos (riscos finos ao longo do anel) e um bisel: a borda de fora e a de dentro pegam luz
  float escova = ruido(vec2(r * 900.0, a * 3.0)) * 0.6 + ruido(vec2(r * 2600.0, a * 9.0)) * 0.4;
  vec3 cm = mix(aco * 0.55, aco * 1.7, 0.5 + 0.5 * n) * (0.82 + 0.36 * escova);
  // reflexo anisotrópico: no aço escovado em círculo, a luz vira uma faixa que corre pelo anel
  float aniso = pow(max(0.0, cos(a - 2.18)), 40.0) + pow(max(0.0, cos(a + 0.96)), 60.0) * 0.4;
  cm += vec3(0.75, 0.8, 0.95) * aniso * faixa(r, 0.88, 0.985, px) * (0.6 + 0.4 * escova);
  float marcas = linha(fract(a / TAU * 120.0) - 0.5, 0.06) * faixa(r, 0.905, 0.965, px);
  float marcas10 = linha(fract(a / TAU * 12.0) - 0.5, 0.012) * faixa(r, 0.9, 0.975, px);
  cm += acoClaro * (0.28 * marcas + 0.5 * marcas10);
  // bisel: frisos claros na borda de cima da luz, escuros embaixo
  float bisel = smoothstep(0.012, 0.0, abs(r - 0.992)) + smoothstep(0.01, 0.0, abs(r - 0.872));
  cm += vec3(0.85, 0.9, 1.0) * bisel * (0.25 + 0.75 * max(0.0, n));
  cm *= 1.0 - 0.55 * smoothstep(0.9, 0.862, r); // sombra de contato onde a moldura encosta na íris
  cor = mix(cor, cm, mold);
  }

  // 2. anel de calibração (0,74 a 0,84): 72 células que acendem com o carregamento, girando até alinhar
  if (r > 0.62 && r < 0.97) {
  float rot = (1.0 - uCal) * 1.6 + uT * 0.015;
  float ac = fract((a + rot) / TAU + 1.0);
  float cel = floor(ac * 72.0), fc = fract(ac * 72.0);
  float celula = faixa(r, 0.755, 0.825, px) * smoothstep(0.08, 0.14, fc) * (1.0 - smoothstep(0.86, 0.92, fc));
  float acesa = step(cel / 72.0, uProg - 0.0001);
  float pisca = 0.75 + 0.25 * sin(uT * 9.0 + cel * 1.7);
  // célula apagada: vidro escuro com um fio de luz em cima; acesa: azul, e a da frente do progresso, branca
  float frenteCel = step(abs(cel / 72.0 - uProg), 0.018);
  vec3 apagada = vec3(0.03, 0.035, 0.06) + vec3(0.25, 0.28, 0.4) * smoothstep(0.82, 0.825, r) * 0.4;
  vec3 cc = mix(apagada, mix(azul * 1.6, vec3(0.9, 0.94, 1.0) * 2.2, frenteCel) * pisca, acesa * uLiga);
  cor = mix(cor, cc, celula);
  // as células acesas soltam luz no aço em volta (o brilho da peça, sem pós-processamento)
  float vaza = faixa(r, 0.74, 0.84, px * 8.0) * acesa * uLiga;
  cor += azul * 0.22 * vaza * (1.0 - celula);
  cor = mix(cor, aco * 0.35, faixa(r, 0.84, 0.86, px) + faixa(r, 0.72, 0.745, px));
  }

  // 3. fibras mecânicas (0,36 a 0,72): ranhuras radiais finas com relevo, dois frisos e o azul subindo de dentro
  if (rm > 0.34 - m && rm < 0.74 + m) {
  float fib = faixa(rm, 0.36, 0.72, px);
  float sulco = 0.5 + 0.5 * cos(am * 180.0 + ruido(vec2(am * 30.0, rm * 8.0)) * 2.5);
  float relevo = 0.5 + 0.5 * cos(am * 36.0 + rm * 22.0);
  vec3 cf = mix(vec3(0.03, 0.04, 0.08), vec3(0.16, 0.2, 0.34), sulco * 0.7 + relevo * 0.3);
  cf += azul * pow(1.0 - smoothstep(0.36, 0.72, rm), 2.2) * 1.6 * uLiga;
  cf += acoClaro * 0.45 * (linha(rm - 0.52, px) + linha(rm - 0.63, px));
  // segmentos que giram ao contrário, como um seletor
  float seg = faixa(rm, 0.575, 0.6, px) * step(0.5, fract((am - uT * 0.06) / TAU * 24.0));
  cf += azul * 0.9 * seg * uLiga;
  // brilhos minúsculos nas arestas das fibras, que acendem quando a luz passa por elas (o olhar mexe a luz)
  vec2 gq = vec2(am * 60.0, rm * 70.0);
  float faisca = step(0.985, hash(floor(gq))) * smoothstep(0.35, 0.0, length(fract(gq) - 0.5));
  cf += vec3(0.8, 0.88, 1.0) * faisca * (0.5 + 0.5 * sin(uT * 2.0 + hash(floor(gq)) * 20.0 + uOlhar.x * 4.0)) * 0.9;
  cf *= 1.0 - 0.6 * smoothstep(0.72, 0.69, rm) * smoothstep(0.66, 0.72, rm); // oclusão sob o anel de calibração
  cor = mix(cor, cf, fib);
  }

  // 4. núcleo emissivo (0,27 a 0,36): o anel aceso, branco por dentro
  if (rf < 0.7) {
  float nuc = faixa(rf, 0.26, 0.37, px);
  float tremor = 0.85 + 0.15 * ruido(vec2(af * 5.0, uT * 6.0));
  vec3 cn = mix(azul * 2.2, vec3(0.85, 0.9, 1.0) * 2.4, smoothstep(0.345, 0.285, rf)) * tremor * uLiga;
  cor = mix(cor, cn, nuc);
  // a luz do núcleo se espalha para fora e para dentro (o brilho da lente)
  cor += azul * 0.55 * exp(-abs(rf - 0.31) * 16.0) * uLiga * (1.0 - nuc);
  }

  // 5. diafragma (r < 0,27): oito lâminas em espiral e a pupila poligonal no meio
  if (rf < 0.29 + m) {
  float ap = uPupila; // raio da abertura
  float N = 8.0, giro = (0.27 - ap) * 6.0;
  float sec = fract((af + giro) / TAU * N);
  // pupila: polígono de 8 lados
  float poli = rf * cos(mod(af + giro, TAU / N) - PI / N) / cos(PI / N);
  float lam = faixa(rf, 0.0, 0.265, px) * smoothstep(ap - px, ap + px, poli);
  float idx = floor((af + giro) / TAU * N);
  vec3 cl = mix(vec3(0.04, 0.05, 0.09), vec3(0.13, 0.15, 0.24), hash(vec2(idx, 3.0)));
  float borda = linha(fract(sec + (rf - ap) * 2.2) - 0.0, 0.035) + linha(fract(sec + (rf - ap) * 2.2) - 1.0, 0.035);
  cl += acoClaro * 0.5 * borda;
  cl += azul * 0.35 * (1.0 - smoothstep(ap, 0.26, rf)) * uLiga;
  cor = mix(cor, cl, lam);
  // dentro da pupila: preto profundo com o reflexo do núcleo lá no fundo
  float pup = smoothstep(ap + px, ap - px, poli);
  // lá dentro: os anéis dos elementos da lente, um reflexo em arco e a luz do núcleo no fundo
  float rp = rf / max(ap, 0.01);
  vec3 cp = azul * 0.28 * exp(-rp * 3.0) * uLiga;
  cp += vec3(0.4, 0.5, 0.9) * 0.18 * (linha(rp - 0.45, 0.03) + linha(rp - 0.72, 0.025) * 0.7) * uLiga;
  cp += vec3(0.95, 0.4, 0.9) * 0.08 * linha(rp - 0.6, 0.04) * smoothstep(0.0, 1.0, -qf.x) * uLiga; // revestimento da lente
  cp += vec3(0.9, 0.95, 1.0) * 0.5 * smoothstep(0.08, 0.0, length((qf / max(ap, 0.01)) - vec2(-0.32, 0.36))) * uLiga;
  cor = mix(cor, cp, pup * step(rf, 0.27));
  }

  // 6. a córnea: um reflexo de janela no alto à esquerda e um ponto de luz
  if (r < 1.0 + m) {
  vec2 h = q - vec2(-0.34, 0.4);
  float jan = smoothstep(0.2, 0.0, length(h * vec2(1.0, 1.7))) * 0.16;
  float ponto = smoothstep(0.04, 0.0, length(q - vec2(-0.22, 0.32))) * 0.7;
  // o vidro da córnea: um arco de reflexo acompanhando a curva, no alto à esquerda
  float arco = smoothstep(0.02, 0.0, abs(r - 0.8)) * smoothstep(0.2, 0.9, dot(normalize(q), L)) * 0.12;
  cor += vec3(0.85, 0.9, 1.0) * (jan + ponto + arco) * cob;
  }

  // halo azul fora da moldura (luz do núcleo vazando)
  float halo = exp(-max(0.0, r - 1.0) * 5.0) * (1.0 - cob) * 0.18 * uLiga;
  cor += azul * halo;
  cor += vec3(0.6, 0.7, 1.0) * uFlash * exp(-r * 1.6) * 1.3;
  return vec4(cor, cob);
}

// a interface holográfica em volta do olho: arcos, marcas de grau e a mira, em traço fino
vec3 hud(vec2 q, float px) {
  float r = length(q), a = atan(q.y, q.x);
  vec3 c = vec3(0.56, 0.66, 1.0);
  float v = 0.0;
  // arco tracejado
  v += linha(r - 1.12, px) * step(0.45, fract(a / TAU * 90.0)) * 0.7;
  // arco parcial que gira
  float a0 = mod(a - uT * 0.25, TAU);
  v += linha(r - 1.26, px * 1.4) * step(a0, 1.4) * 0.9;
  v += linha(r - 1.26, px) * step(3.2, a0) * step(a0, 3.6) * 0.9;
  // escala de grau (marca maior a cada 10)
  float g = fract(a / TAU * 72.0), g10 = fract(a / TAU * 7.2);
  v += faixa(r, 1.36, 1.39, px) * linha(g - 0.5, 0.06) * 0.55;
  v += faixa(r, 1.36, 1.44, px) * linha(g10 - 0.5, 0.008) * 0.8;
  // mira: dois traços horizontais que param antes do olho e dois verticais curtos
  float hx = linha(q.y, px) * step(1.5, abs(q.x)) * (1.0 - smoothstep(2.6, 4.2, abs(q.x)));
  float vy = linha(q.x, px) * step(1.5, abs(q.y)) * (1.0 - smoothstep(1.62, 1.75, abs(q.y)));
  v += (hx + vy) * 0.6;
  // um ponto que percorre o arco externo
  float pa = mod(uT * 0.6, TAU);
  v += smoothstep(0.03, 0.0, length(q - 1.26 * vec2(cos(pa), sin(pa)))) * 1.2;
  // o progresso real num arco mais grosso, de cima, no sentido horário
  float ap = mod(PI * 0.5 - a, TAU) / TAU;
  v += faixa(r, 1.185, 1.2, px) * step(ap, uProg) * 1.1;
  v += faixa(r, 1.185, 1.2, px) * (1.0 - step(ap, uProg)) * 0.15;
  return c * v;
}

// poeira em suspensão na luz do olho: pontos desfocados que derivam devagar, cada camada numa profundidade
vec3 poeira(vec2 q, float t) {
  vec3 s = vec3(0.0);
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    vec2 p = q * (2.2 + fk * 1.3) + vec2(t * (0.03 + fk * 0.015), -t * 0.02) - uOlhar * (0.15 + fk * 0.12);
    vec2 c = floor(p), f = fract(p) - 0.5;
    float h = hash(c + fk * 13.0);
    if (h > 0.18) continue;
    vec2 o = (vec2(hash(c + 1.7), hash(c + 3.1)) - 0.5) * 0.6;
    float tam = 0.06 + fk * 0.05;
    float d = length(f - o);
    s += vec3(0.5, 0.6, 1.0) * smoothstep(tam, tam * 0.2, d) * (0.25 - fk * 0.06) * (0.6 + 0.4 * sin(t + h * 40.0));
  }
  return s * exp(-length(q) * 0.55);
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr; // px css, y para baixo
  vec2 tam = uRes / uDpr;
  // glitch: só no olho e no anel em volta dele (zona), algumas fatias horizontais saltam para o lado e ele treme
  float banda = 0.0;
  float yOrig = frag.y;
  float zona = 0.0;
  if (uGlitch > 0.001) {
    zona = 1.0 - smoothstep(1.7, 2.7, length((frag - uE) / (uZ * uEr * uIris)));
    float alturaFatia = 5.0 + 38.0 * hash(vec2(uSemente, 3.1));
    float fy = floor(frag.y / alturaFatia);
    banda = step(0.7, hash(vec2(fy, uSemente))) * zona;
    frag.x += banda * (hash(vec2(fy * 1.7, uSemente + 1.0)) - 0.5) * 90.0 * uGlitch;
    frag += (vec2(hash(vec2(uSemente, 7.0)), hash(vec2(uSemente, 9.0))) - 0.5) * 7.0 * uGlitch * zona;
  }
  // câmera: recua ancorada no olho. O ponto da tela corresponde a este ponto do enquadramento final:
  vec2 p1 = uE + (frag - uE) / uZ;

  // o olho procedimental: em unidades do olho (raio uEr no enquadramento final). Só os pixels dele e do halo fazem a conta
  vec2 q = (frag - uE) / (uZ * uEr * uIris);
  float px = 1.0 / (uZ * uEr * uIris);
  float rq = length(q);
  vec4 o = vec4(0.0);
  if (uPerto > 0.01 && rq < 2.4) {
    o = iris(q, px * 1.2);
    // aberração cromática de lente: o vermelho e o azul saem um pouco deslocados, só nas bordas fortes (o anel de fora)
#ifdef COM_CA
    if (rq > 0.6 && rq < 1.06) {
      float ca = 0.006 * smoothstep(0.2, 1.0, rq);
      o.r = iris(q * (1.0 + ca), px * 1.2).r;
      o.b = iris(q * (1.0 - ca), px * 1.2).b;
    }
#endif
  }

  vec3 fundo = mix(vec3(0.008, 0.01, 0.03), vec3(0.0, 0.0, 0.5), uSala);
  vec3 cor = fundo;
  // dentro do disco do olho a foto fica coberta: nem se lê a textura
  if (!(uPerto > 0.99 && o.a > 0.99)) {
    // o herói empurra o rosto para a câmera pelo relevo (perspectiva: fov 30, câmera a 10): onde o ponto da tela estava
    // na foto plana? Três passos do ponto fixo bastam
    vec2 cen = 0.5 * tam;
    vec2 g = p1;
    for (int i = 0; i < 3; i++) {
      vec2 ug = (g - uR.xy) / uR.zw;
      float zz = relevoFoto(clamp(vec2(ug.x, 1.0 - ug.y), 0.0, 1.0)) * RELEVO;
      g = cen + (p1 - cen) * (10.0 - zz) / 10.0;
    }
    vec2 uv = (g - uR.xy) / uR.zw;
    vec4 foto = (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) ? texture(uFoto, uv) : vec4(0.0);
    // a mesma composição do retrato do topo (src/cena/Retrato.tsx): o corpo se dissolve nas laterais e na borda de baixo
    // (sem esse degradê, o ombro aparecia cortado em linha reta); depois, o halo azul e as curvas de nível da silhueta
    vec2 f = vec2(uv.x, 1.0 - uv.y);
    float dentro = step(0.0, f.x) * step(f.x, 1.0) * step(0.0, f.y) * step(f.y, 1.0);
    float sy = 1.0 - g.y / tam.y;
    float diss = smoothstep(0.02, 0.22, f.x) * smoothstep(0.98, 0.78, f.x) * smoothstep(0.0, 0.2, sy) * smoothstep(0.0, 0.16, f.y) * dentro;
    float alfa = foto.a * diss;
    // a foto aparece com a luz da sala: antes, só um vulto escuro e azulado
    vec3 cf = foto.rgb * diss * mix(0.12, 1.0, uSala) + vec3(0.0, 0.02, 0.12) * (1.0 - uSala) * alfa;
    cor = mix(fundo, cf, alfa * mix(0.55, 1.0, uSala));
    // (a imagem entra sem inverter o eixo Y, ao contrário do three.js do herói: aqui se amostra com o uv de cima para baixo)
    float aura = texture(uAura, clamp(uv, 0.0, 1.0)).r * diss;
    float kk = aura * 9.0 - uFase * 0.22;
    float dk = min(fract(kk), 1.0 - fract(kk));
    float linhaN = 1.0 - smoothstep(0.0, fwidth(kk) * 1.3, dk);
    float faixaN = smoothstep(0.012, 0.1, aura) * (1.0 - smoothstep(0.6, 0.9, aura));
    float fora = 1.0 - alfa;
    cor = mix(cor, vec3(0.0, 0.0, 0.94), smoothstep(0.3, 0.8, aura) * fora * 0.035 * uSala);
    cor = mix(cor, vec3(0.647, 0.663, 0.706), linhaN * faixaN * fora * 0.5 * uSala);
  }

  // de perto ele é a cena; de longe, se funde no olho da foto
  cor = mix(cor, o.rgb, o.a * uPerto);
  cor += o.rgb * (1.0 - o.a) * uPerto; // halo e reflexos fora da moldura
  if (uHud * uPerto > 0.01 && rq > 1.0 && rq < 4.5) cor += hud(q, px * 1.1) * uHud * uPerto;
  if (uLiga * uPerto * (1.0 - uSala) > 0.01 && rq < 3.0) cor += poeira(q, uT) * uLiga * uPerto * (1.0 - uSala);
  // no foco, um risco anamórfico horizontal atravessa a tela
  cor += vec3(0.45, 0.55, 1.0) * uFlash * exp(-abs(q.y) * 60.0) * exp(-abs(q.x) * 0.25) * 0.9;

  // câmera: tom, vinheta e grão (somem quando a sala acende)
  // (com a sala acesa o mapeamento de tom sai de cena: a imagem final tem de ser idêntica à do retrato do topo)
  cor = mix(1.0 - exp(-cor * 1.25), cor, uSala);
  float vin = smoothstep(1.25, 0.3, length((frag / tam - 0.5) * vec2(1.4, 1.0)));
  cor *= mix(1.0, mix(0.35, 1.0, vin), 1.0 - uSala);
  cor += (hash(gl_FragCoord.xy + fract(uT * 7.0) * 100.0) - 0.5) * 0.045 * (1.0 - uSala * 0.8);
  // o resto do glitch: as fatias que saltaram ficam azuladas, rasgos claros de uma linha e linhas de varredura
  if (uGlitch > 0.001) {
    cor = mix(cor, vec3(cor.b * 0.35, cor.g * 0.6, max(cor.r, cor.b) * 1.5 + 0.05), banda * 0.5 * uGlitch);
    cor += vec3(0.35, 0.5, 1.0) * step(0.965, hash(vec2(floor(yOrig / 2.0), uSemente + 5.0))) * 0.55 * uGlitch * zona;
    cor *= 1.0 - 0.2 * uGlitch * zona * step(0.5, fract(yOrig * 0.5));
  }
  saida = vec4(cor, 1.0);
}
`
