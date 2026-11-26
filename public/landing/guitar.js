// Guitarra elétrica 3D da landing (Three.js, modelo procedural em centímetros).
// Fica fixa atrás da página: no topo aparece inteira na diagonal; ao rolar, gira no eixo do braço e as costas do
// braço (maple) viram o fundo das seções. Arrastar com o mouse ou o dedo gira a guitarra e faz as cordas vibrarem.
import * as THREE from "three";
import { RoomEnvironment } from "/vendor/three/RoomEnvironment.js";

const canvas = document.getElementById("stage");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const phone = matchMedia("(max-width: 700px)").matches;

function webgl() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
if (!canvas || !webgl()) {
  document.documentElement.classList.add("no-webgl");
  throw new Error("guitar: sem WebGL, mostrando a imagem parada");
}

// ------------------------------------------------------------------ renderer, cena, câmera
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, phone ? 1.25 : 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// shader recusado pela GPU: mostra a imagem parada da guitarra no lugar
renderer.debug.onShaderError = () => {
  document.documentElement.classList.add("no-webgl");
};

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
scene.environmentIntensity = 0.85;
const key = new THREE.DirectionalLight(0xfff6e8, 2.6);
key.position.set(-40, 80, 90);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.radius = 14;
key.shadow.blurSamples = 16;
key.shadow.bias = -0.0005;
Object.assign(key.shadow.camera, { left: -160, right: 160, top: 160, bottom: -160, near: 1, far: 600 });
scene.add(key);
// o "chão" atrás da guitarra só recebe a sombra (some quando o braço vira fundo)
const shadowMat = new THREE.ShadowMaterial({ opacity: 0.13 });
const catcher = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), shadowMat);
catcher.position.z = -36;
catcher.receiveShadow = true;
scene.add(catcher);
const rim = new THREE.DirectionalLight(0xdfeefa, 1.2);
rim.position.set(60, -20, -40);
scene.add(rim);

const camera = new THREE.PerspectiveCamera(28, 1, 1, 2000);
camera.position.set(0, 0, 230);

// ------------------------------------------------------------------ texturas
function woodTexture({ base = "#e0b06e", line = "rgba(120,70,25,", w = 512, h = 2048, seed = 1 } = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 140; i++) {
    const x0 = rnd() * w;
    const a = 0.05 + rnd() * 0.14;
    g.strokeStyle = `${line}${a})`;
    g.lineWidth = 0.6 + rnd() * 2.2;
    g.beginPath();
    for (let y = 0; y <= h; y += 16) {
      const x = x0 + Math.sin(y / (90 + rnd() * 6) + i) * (3 + rnd() * 2) + Math.sin(y / 400 + i * 0.3) * 8;
      if (y === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `${line}${0.05 + rnd() * 0.08})`;
    g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 6 + rnd() * 16);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
// maple torrado (braço) e jacarandá (escala): madeiras mais escuras, para contrastar com o fundo creme
const mapleTex = woodTexture({ base: "#a8692f", line: "rgba(70,32,8,", seed: 7 });
const rosewoodTex = woodTexture({ base: "#3a2216", line: "rgba(12,6,3,", seed: 3, w: 256, h: 2048 });
// peças extrudadas têm UV em centímetros: a textura cobre cerca de 6 × 50 cm (escala) e 10 × 40 cm (cabeça)
rosewoodTex.repeat.set(1 / 6, 1 / 50);
const mapleHeadTex = mapleTex.clone();
mapleHeadTex.repeat.set(1 / 10, 1 / 40);
mapleHeadTex.needsUpdate = true;

// ------------------------------------------------------------------ materiais
const M = {
  body: new THREE.MeshPhysicalMaterial({ color: 0x0b0a09, roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.4 }),
  guard: new THREE.MeshPhysicalMaterial({ color: 0xf6f3ec, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.12, sheen: 0.6, sheenColor: 0xe9f1f4 }),
  pickup: new THREE.MeshPhysicalMaterial({ color: 0xeee6d3, roughness: 0.4, clearcoat: 0.4 }),
  maple: new THREE.MeshPhysicalMaterial({ map: mapleHeadTex, color: 0xffffff, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
  rosewood: new THREE.MeshPhysicalMaterial({ map: rosewoodTex, color: 0xffffff, roughness: 0.7, clearcoat: 0.1 }),
  mapleSatin: new THREE.MeshPhysicalMaterial({ map: mapleTex, color: 0xffffff, roughness: 0.55, clearcoat: 0.25, side: THREE.DoubleSide }),
  walnut: new THREE.MeshStandardMaterial({ color: 0x5c3418, roughness: 0.6 }),
  dot: new THREE.MeshPhysicalMaterial({ color: 0xf3eee2, roughness: 0.25, iridescence: 0.8, iridescenceIOR: 1.5, clearcoat: 1 }),
  bone: new THREE.MeshStandardMaterial({ color: 0xf4ecd8, roughness: 0.5 }),
  // ferragens douradas (a cor da marca): tarraxas, ponte, alavanca, placa do braço
  chrome: new THREE.MeshStandardMaterial({ color: 0xe0b660, metalness: 1, roughness: 0.18 }),
  nickel: new THREE.MeshStandardMaterial({ color: 0xd9d6cf, metalness: 1, roughness: 0.22 }),
  pole: new THREE.MeshStandardMaterial({ color: 0x9a968e, metalness: 1, roughness: 0.3 }),
  string: new THREE.MeshStandardMaterial({ color: 0xe6e2da, metalness: 1, roughness: 0.25 }),
  knob: new THREE.MeshPhysicalMaterial({ color: 0xf6f2e8, roughness: 0.35, clearcoat: 0.5 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x1b1712, roughness: 0.5 }),
};

// ------------------------------------------------------------------ medidas (cm)
const SCALE = 64.8; // escala real
const BRIDGE_Y = -11.6; // linha dos carrinhos
const NUT_Y = BRIDGE_Y + SCALE; // 53.2
const BODY_D = 4.2; // espessura do corpo
const FRONT = BODY_D / 2 + 0.5; // face da frente (com o chanfro)
const BACK = -FRONT;

const guitar = new THREE.Group();
scene.add(guitar);
const inner = new THREE.Group(); // gira no eixo do braço
guitar.add(inner);
inner.position.y = -18; // o pivô fica perto do meio do braço

const add = (geo, mat, x = 0, y = 0, z = 0, parent = inner) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
};

// ------------------------------------------------------------------ corpo: duas pontas, contorno próprio
// contorno de uma Stratocaster (cerca de 45,7 × 32,4 cm): duas pontas assimétricas, a do lado grave mais alta
const bodyShape = new THREE.Shape();
bodyShape.moveTo(0, -23);
bodyShape.bezierCurveTo(9.5, -23.2, 16.4, -18.5, 16.2, -10);
bodyShape.bezierCurveTo(16.0, -3.5, 12.0, -0.5, 12.4, 4);
bodyShape.bezierCurveTo(12.8, 8.5, 15.8, 13.5, 12.8, 18.4);
bodyShape.bezierCurveTo(10.9, 20.8, 7.8, 16.2, 5.6, 12.2);
bodyShape.bezierCurveTo(4.6, 10.6, 3.4, 11.8, 3.2, 13.3);
bodyShape.lineTo(3.2, 16.4);
bodyShape.lineTo(-3.2, 16.4);
bodyShape.lineTo(-3.2, 13.8);
bodyShape.bezierCurveTo(-4.4, 13.2, -6.6, 17.0, -7.4, 21.0);
bodyShape.bezierCurveTo(-8.0, 24.0, -11.6, 25.6, -13.4, 24.0);
bodyShape.bezierCurveTo(-15.4, 22.2, -15.0, 18.0, -14.4, 14.0);
bodyShape.bezierCurveTo(-13.8, 9.6, -13.2, 4.0, -14.8, -0.5);
bodyShape.bezierCurveTo(-17.2, -5.0, -17.6, -17.5, -9.5, -22.0);
bodyShape.bezierCurveTo(-6.5, -23.3, -3.0, -23.1, 0, -23);
const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
  depth: BODY_D,
  bevelEnabled: true,
  bevelThickness: 0.55,
  bevelSize: 0.55,
  bevelSegments: 6,
  curveSegments: 64,
});
bodyGeo.translate(0, 0, -BODY_D / 2);
add(bodyGeo, M.body);

// escudo (pickguard) branco, contorno próprio
const guard = new THREE.Shape();
guard.moveTo(-3.3, 15.6);
guard.bezierCurveTo(-6.4, 15.2, -9.6, 14.6, -11.0, 10.6);
guard.bezierCurveTo(-12.2, 7.2, -11.4, 1.6, -9.6, -2.8);
guard.bezierCurveTo(-8.0, -7.4, -6.6, -11.6, -2.4, -13.6);
guard.bezierCurveTo(1.6, -15.4, 6.2, -16.4, 9.8, -15.0);
guard.bezierCurveTo(13.0, -13.6, 13.6, -9.4, 12.4, -5.8);
guard.bezierCurveTo(11.2, -2.2, 10.4, 3.2, 10.6, 7.2);
guard.bezierCurveTo(10.8, 10.6, 8.8, 13.4, 5.6, 13.6);
guard.bezierCurveTo(4.6, 13.7, 3.8, 14.4, 3.3, 15.6);
guard.lineTo(-3.3, 15.6);
const guardGeo = new THREE.ExtrudeGeometry(guard, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.08, bevelSegments: 2, curveSegments: 48 });
// o escudo cobre o centro do corpo, deixando o azul aparecer em volta (como na referência)
guardGeo.scale(0.8, 0.86, 1);
guardGeo.translate(0.4, 2.2, 0);
add(guardGeo, M.guard, 0, 0, FRONT - 0.02);

// captadores single-coil (neck, middle, bridge inclinado)
function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2,
    y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
const pickupGeo = new THREE.ExtrudeGeometry(roundedRect(7.2, 1.9, 0.9), { depth: 0.9, bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.18, bevelSegments: 4, curveSegments: 16 });
const poleGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.12, 16).rotateX(Math.PI / 2);
for (const [y, rot] of [[9.2, 0], [2.6, 0], [-5.0, -0.14]]) {
  const g = new THREE.Group();
  g.position.set(0, y, FRONT + 0.2);
  g.rotation.z = rot;
  inner.add(g);
  add(pickupGeo, M.pickup, 0, 0, 0, g);
  for (let i = 0; i < 6; i++) add(poleGeo, M.pole, (i - 2.5) * 1.05, 0, 1.12, g);
}

// ponte: placa, 6 carrinhos e parafusos
add(new THREE.BoxGeometry(8.6, 4.0, 0.22), M.chrome, 0, BRIDGE_Y - 1.2, FRONT + 0.1);
for (let i = 0; i < 6; i++) {
  add(new THREE.BoxGeometry(0.95, 2.0, 0.5), M.chrome, (i - 2.5) * 1.06, BRIDGE_Y - 0.6, FRONT + 0.45);
}
// alavanca do tremolo (o "whammy bar") e o conector de saída na face da frente
{
  const arm = new THREE.CatmullRomCurve3([
    new THREE.Vector3(4.6, BRIDGE_Y - 2.2, FRONT + 0.5),
    new THREE.Vector3(5.0, BRIDGE_Y - 2.3, FRONT + 1.4),
    new THREE.Vector3(7.4, BRIDGE_Y - 3.2, FRONT + 1.7),
    new THREE.Vector3(11.0, BRIDGE_Y - 4.6, FRONT + 1.6),
    new THREE.Vector3(13.4, BRIDGE_Y - 5.6, FRONT + 1.3),
  ]);
  add(new THREE.TubeGeometry(arm, 48, 0.22, 10), M.chrome);
  add(new THREE.SphereGeometry(0.55, 16, 12).scale(1.4, 1, 1), M.knob, 13.8, BRIDGE_Y - 5.8, FRONT + 1.25);
  const jack = add(new THREE.CylinderGeometry(1.5, 1.5, 0.3, 32).rotateX(Math.PI / 2), M.chrome, 12.6, -15.2, FRONT - 0.15);
  jack.scale.set(0.7, 1.25, 1);
  jack.rotation.z = -0.6;
  add(new THREE.CylinderGeometry(0.42, 0.42, 0.5, 16).rotateX(Math.PI / 2), M.dark, 12.6, -15.2, FRONT + 0.05);
}
// knobs e chave seletora
const knobGeo = new THREE.CylinderGeometry(1.0, 1.1, 1.3, 32).rotateX(Math.PI / 2);
const knobTop = new THREE.SphereGeometry(1.0, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, 0.25);
for (const [x, y] of [[8.6, -11.4], [10.6, -7.2], [11.4, -2.6]]) {
  add(knobGeo, M.knob, x, y, FRONT + 0.85);
  add(knobTop, M.knob, x, y, FRONT + 1.5);
}
add(new THREE.BoxGeometry(0.5, 2.6, 0.2), M.chrome, 9.4, 4.6, FRONT + 0.25).rotation.z = 0.5;
add(new THREE.CylinderGeometry(0.22, 0.22, 1.3, 12).rotateX(Math.PI / 2), M.dark, 9.2, 5.0, FRONT + 0.9);

// costas do corpo: placa do braço com 4 parafusos e tampa da cavidade do tremolo
add(new THREE.BoxGeometry(5.0, 6.2, 0.2), M.chrome, 0, 12.8, BACK - 0.08);
for (const [x, y] of [[-1.7, 10.6], [1.7, 10.6], [-1.7, 15.0], [1.7, 15.0]]) {
  add(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 16).rotateX(Math.PI / 2), M.nickel, x, y, BACK - 0.22);
}
const trem = new THREE.ExtrudeGeometry(roundedRect(8.4, 10.4, 1.2), { depth: 0.12, bevelEnabled: false });
add(trem, M.guard, 0, -9.2, BACK - 0.14).rotation.y = Math.PI;
for (let i = 0; i < 6; i++) add(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 16).rotateX(Math.PI / 2), M.dark, (i - 2.5) * 1.06, -10.4, BACK - 0.18);

// ------------------------------------------------------------------ braço (costas arredondadas) e escala
const NECK_Y0 = 10.5; // começa dentro do corpo
const NECK_Y1 = NUT_Y + 0.3;
const widthAt = (y) => {
  const t = (y - NUT_Y) / (NECK_Y0 - NUT_Y); // 0 na pestana, 1 no corpo
  return 4.3 + (5.7 - 4.3) * Math.min(1, Math.max(0, t));
};
const depthAt = (y) => {
  const t = (y - NUT_Y) / (NECK_Y0 - NUT_Y);
  return 2.0 + 0.45 * Math.min(1, Math.max(0, t));
};
const BOARD_Z = FRONT + 0.7; // topo da madeira do braço (abaixo da escala)

function neckGeometry() {
  const segL = 120,
    segA = 28;
  const pos = [],
    uv = [],
    idx = [];
  for (let i = 0; i <= segL; i++) {
    const y = NECK_Y0 + ((NECK_Y1 - NECK_Y0) * i) / segL;
    const w = widthAt(y) / 2,
      d = depthAt(y);
    for (let j = 0; j <= segA; j++) {
      const a = (Math.PI * j) / segA; // 0..π: um lado, as costas, o outro lado
      pos.push(Math.cos(a) * w, y, BOARD_Z - Math.sin(a) * d);
      uv.push(j / segA, i / segL);
    }
  }
  for (let i = 0; i < segL; i++)
    for (let j = 0; j < segA; j++) {
      const a = i * (segA + 1) + j,
        b = a + segA + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
add(neckGeometry(), M.mapleSatin);
// filete escuro nas costas do braço
{
  const segL = 80,
    pos = [],
    idx = [];
  for (let i = 0; i <= segL; i++) {
    const y = NECK_Y0 + 2 + ((NUT_Y - 2 - NECK_Y0 - 2) * i) / segL;
    const d = depthAt(y) + 0.012;
    pos.push(-0.22, y, BOARD_Z - d, 0.22, y, BOARD_Z - d);
  }
  for (let i = 0; i < segL; i++) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  add(g, M.walnut);
}
// escala de maple (trapézio)
const board = new THREE.Shape();
board.moveTo(-widthAt(NECK_Y0) / 2, NECK_Y0);
board.lineTo(widthAt(NECK_Y0) / 2, NECK_Y0);
board.lineTo(widthAt(NUT_Y) / 2, NUT_Y);
board.lineTo(-widthAt(NUT_Y) / 2, NUT_Y);
board.closePath();
const boardGeo = new THREE.ExtrudeGeometry(board, { depth: 0.55, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 });
add(boardGeo, M.rosewood, 0, 0, BOARD_Z);
const TOP = BOARD_Z + 0.61; // topo da escala

// trastes (21) e marcações
const fretY = (n) => NUT_Y - SCALE * (1 - Math.pow(2, -n / 12));
for (let n = 1; n <= 21; n++) {
  const y = fretY(n);
  const w = widthAt(y) - 0.1;
  add(new THREE.CylinderGeometry(0.075, 0.075, w, 10, 1).rotateZ(Math.PI / 2), M.nickel, 0, y, TOP + 0.02);
}
const dotGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.04, 20).rotateX(Math.PI / 2);
for (const n of [3, 5, 7, 9, 15, 17, 19, 21]) add(dotGeo, M.dot, 0, (fretY(n - 1) + fretY(n)) / 2, TOP);
for (const x of [-1.1, 1.1]) add(dotGeo, M.dot, x, (fretY(11) + fretY(12)) / 2, TOP);
add(new THREE.BoxGeometry(widthAt(NUT_Y) + 0.05, 0.45, 0.5), M.bone, 0, NUT_Y + 0.1, TOP + 0.12);

// cabeça: contorno próprio, 6 tarraxas em linha do lado dos graves
const head = new THREE.Shape();
head.moveTo(-2.15, NUT_Y + 0.3);
head.lineTo(-2.4, NUT_Y + 3.0);
head.bezierCurveTo(-3.4, NUT_Y + 5.0, -3.6, NUT_Y + 14, -3.0, NUT_Y + 17.2);
head.bezierCurveTo(-2.6, NUT_Y + 19.4, 0.4, NUT_Y + 20.0, 2.4, NUT_Y + 18.6);
head.bezierCurveTo(4.6, NUT_Y + 17.0, 5.2, NUT_Y + 13.6, 4.4, NUT_Y + 11.2);
head.bezierCurveTo(3.6, NUT_Y + 8.6, 2.2, NUT_Y + 6.8, 2.15, NUT_Y + 0.3);
head.lineTo(-2.15, NUT_Y + 0.3);
const headGeo = new THREE.ExtrudeGeometry(head, { depth: 1.5, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelSegments: 3, curveSegments: 40 });
add(headGeo, M.maple, 0, 0, TOP - 1.9);
const posts = [];
for (let i = 0; i < 6; i++) {
  const y = NUT_Y + 3.6 + i * 2.55;
  const x = -1.6 + Math.max(0, 1.2 - i * 0.25) * 0;
  posts.push(new THREE.Vector3(x, y, TOP + 0.6));
  add(new THREE.CylinderGeometry(0.36, 0.42, 1.2, 16).rotateX(Math.PI / 2), M.chrome, x, y, TOP + 0.1);
  add(new THREE.CylinderGeometry(0.62, 0.62, 0.3, 20).rotateX(Math.PI / 2), M.chrome, x, y, TOP - 0.25);
  // eixo e botão saindo pela lateral (costas da cabeça)
  add(new THREE.CylinderGeometry(0.2, 0.2, 2.6, 10).rotateZ(Math.PI / 2), M.chrome, x - 1.9, y, TOP - 1.2);
  const keyM = add(new THREE.SphereGeometry(0.75, 20, 14), M.chrome, x - 3.4, y, TOP - 1.2);
  keyM.scale.set(0.45, 1.05, 0.9);
}
add(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 10).rotateX(Math.PI / 2), M.chrome, 0.2, NUT_Y + 6.6, TOP + 0.3);

// ------------------------------------------------------------------ cordas (vibram ao arrastar)
const strings = [];
const SEG = 48;
for (let i = 0; i < 6; i++) {
  const r = 0.028 + (5 - i) * 0.008; // grave mais grossa
  const saddle = new THREE.Vector3((i - 2.5) * 1.06, BRIDGE_Y, FRONT + 0.75);
  const nut = new THREE.Vector3((i - 2.5) * 0.72, NUT_Y + 0.1, TOP + 0.38);
  const geo = new THREE.CylinderGeometry(r, r, 1, 6, SEG, true);
  const base = geo.attributes.position.array.slice();
  const mesh = add(geo, M.string);
  // posiciona o cilindro unitário entre a ponte e a pestana
  const mid = saddle.clone().add(nut).multiplyScalar(0.5);
  mesh.position.copy(mid);
  mesh.scale.y = saddle.distanceTo(nut);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nut.clone().sub(saddle).normalize());
  strings.push({ geo, base, amp: 0, phase: i * 0.7, freq: 26 - i * 2.2 });
  // da pestana até a tarraxa (a 6ª corda, aguda, vai para a última tarraxa)
  const post = posts[5 - i];
  const g2 = new THREE.CylinderGeometry(r, r, 1, 6, 1, true);
  const m2 = add(g2, M.string);
  m2.position.copy(nut.clone().add(post).multiplyScalar(0.5));
  m2.scale.y = nut.distanceTo(post);
  m2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), post.clone().sub(nut).normalize());
}
function vibrate(dt, time) {
  let any = false;
  for (const s of strings) {
    if (s.amp < 0.0005 && !s.dirty) continue;
    const p = s.geo.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const y = s.base[k * 3 + 1]; // -0.5..0.5
      const env = Math.sin(Math.PI * (y + 0.5));
      p.array[k * 3] = s.base[k * 3] + Math.sin(time * s.freq + s.phase) * s.amp * env;
    }
    p.needsUpdate = true;
    s.dirty = s.amp >= 0.0005;
    s.amp *= Math.exp(-dt * 3.2);
    any = any || s.amp >= 0.0005;
  }
  return any;
}

inner.traverse((o) => {
  if (o.isMesh) o.castShadow = true;
});

// ------------------------------------------------------------------ pose: topo da página → braço como fundo
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
let W = 1,
  H = 1;
function resize() {
  lockedDrawn = false;
  W = innerWidth;
  H = innerHeight;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  wake();
}
// metade da largura e da altura visíveis no plano z = 0, em cm
const viewHalf = () => {
  const h = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  return { w: h * camera.aspect, h };
};

function targetPose(scrollP) {
  const v = viewHalf();
  const narrow = W < 1024;
  // A: a guitarra inteira na diagonal, à direita do texto (no celular, embaixo)
  const A = {
    x: narrow ? v.w * 0.18 : v.w * 0.42,
    y: narrow ? -v.h * 0.42 : -v.h * 0.06,
    z: 0,
    rz: narrow ? -0.62 : -0.56,
    ry: 0.42,
    rx: -0.12,
    spin: 0,
    s: narrow ? Math.min(1, (v.h * 1.25) / 100) : Math.min(1.08, (v.h * 1.85) / 100),
  };
  // B: virada no eixo do braço, as costas do braço atravessando a tela em diagonal
  // B: só o braço, visto por trás, deitado na horizontal e grande, cobrindo a largura toda da tela.
  // (rz = -90°: o braço aponta para a direita; spin = 180°: as costas de maple para a frente)
  const bs = (v.h * 2 * 1.5) / 5.6; // a largura do braço cobre a altura toda da tela (com folga)
  const mid = 14; // ponto do braço (y local) que fica no centro da tela
  const B = { x: -mid * bs, y: -v.h * 0.22, z: 0, rz: -Math.PI / 2, ry: 0.0, rx: 0.16, spin: Math.PI, s: bs };
  const t = ease(Math.min(1, Math.max(0, scrollP)));
  const out = {};
  for (const k in A) out[k] = lerp(A[k], B[k], t);
  return out;
}

// ------------------------------------------------------------------ arrastar (com inércia)
const drag = { yaw: 0, pitch: 0, vy: 0, vp: 0, active: false, lx: 0, ly: 0, id: null };
const NO_DRAG = "a,button,input,textarea,select,label,summary,details,[data-no-drag],.btn,.rows li,figure,img,video,iframe,p,h1,h2,h3,li,address,nav";
addEventListener(
  "pointerdown",
  (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const t = e.target;
    if (!(t instanceof Element) || t.closest(NO_DRAG)) return;
    if (scrollProgress() >= 0.98) return; // cobrindo o fundo, a guitarra fica imóvel
    if (!t.closest("main, .hero, body")) return;
    drag.active = true;
    drag.id = e.pointerId;
    drag.lx = e.clientX;
    drag.ly = e.clientY;
    document.documentElement.classList.add("is-dragging");
    wake();
  },
  { passive: true },
);
addEventListener(
  "pointermove",
  (e) => {
    if (!drag.active || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.lx,
      dy = e.clientY - drag.ly;
    drag.lx = e.clientX;
    drag.ly = e.clientY;
    drag.vy = dx * 0.012;
    drag.vp = dy * 0.008;
    drag.yaw += drag.vy;
    drag.pitch = Math.max(-0.7, Math.min(0.7, drag.pitch + drag.vp));
    const speed = Math.min(1, Math.hypot(dx, dy) / 40);
    for (const s of strings) {
      s.amp = Math.max(s.amp, 0.09 * speed);
      s.dirty = true;
    }
    document.dispatchEvent(new CustomEvent("guitar:strum", { detail: { speed } }));
    wake();
  },
  { passive: true },
);
const endDrag = () => {
  drag.active = false;
  drag.id = null;
  document.documentElement.classList.remove("is-dragging");
};
addEventListener("pointerup", endDrag);
addEventListener("pointercancel", endDrag);

// ------------------------------------------------------------------ laço: só desenha quando algo muda
let raf = 0,
  last = 0,
  time = 0,
  cur = null,
  needs = true;
function scrollProgress() {
  // 0 no topo, 1 depois do primeiro quadro e meio
  return Math.min(1, scrollY / (H * 1.3));
}
// depois que o braço cobre o fundo (progresso 1), a guitarra fica imóvel: desenha uma vez e para.
let lockedDrawn = false;
function wake() {
  if (lockedDrawn && scrollProgress() >= 1) return;
  needs = true;
  if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
}
function frame(ts) {
  raf = 0;
  const dt = Math.min(0.05, (ts - (last || ts)) / 1000);
  last = ts;
  time += dt;
  const p = reduced ? 0 : scrollProgress();
  const locked = p >= 1;
  const target = targetPose(p);
  if (!cur || locked) cur = { ...target };
  if (locked) {
    // imóvel: a pose exata do fundo, sem arraste nem cordas vibrando
    drag.active = false;
    drag.yaw = drag.pitch = drag.vy = drag.vp = 0;
    for (const st of strings) {
      st.amp = 0;
      st.dirty = true;
    }
  }
  // a sombra no "chão" só existe com a guitarra inteira à vista
  shadowMat.opacity = 0.13 * Math.max(0, 1 - p * 2.5);
  catcher.visible = shadowMat.opacity > 0.001;
  renderer.shadowMap.autoUpdate = catcher.visible;
  const k = 1 - Math.exp(-dt * 7);
  let moving = false;
  for (const key in target) {
    const d = target[key] - cur[key];
    if (Math.abs(d) > 1e-4) moving = true;
    cur[key] += d * (reduced ? 1 : k);
  }
  if (!drag.active) {
    drag.yaw += drag.vy;
    drag.vy *= Math.exp(-dt * 3);
    // volta devagar para a pose da rolagem
    drag.yaw *= Math.exp(-dt * 0.9);
    drag.pitch *= Math.exp(-dt * 1.4);
    if (Math.abs(drag.vy) > 1e-4 || Math.abs(drag.yaw) > 1e-3 || Math.abs(drag.pitch) > 1e-3) moving = true;
  }
  guitar.position.set(cur.x, cur.y, cur.z);
  guitar.rotation.set(cur.rx + drag.pitch, cur.ry + drag.yaw * 0.35, cur.rz);
  guitar.scale.setScalar(cur.s);
  inner.rotation.y = cur.spin + drag.yaw;
  const vib = vibrate(dt, time);
  renderer.render(scene, camera);
  canvas.classList.add("is-ready");
  if (locked) {
    lockedDrawn = true;
    needs = false;
    return;
  }
  lockedDrawn = false;
  if (moving || vib || drag.active || needs) {
    needs = false;
    raf = requestAnimationFrame(frame);
  }
}
addEventListener("scroll", wake, { passive: true });
addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => !document.hidden && wake());
resize();
/** A guitarra inteira, de frente e na diagonal, num quadro w×h com fundo transparente (a imagem parada). */
function still(w = 900, h = 1200) {
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const v = viewHalf();
  const s = (v.h * 1.72) / 100;
  guitar.position.set(-v.w * 0.02, -v.h * 0.12, 0);
  guitar.rotation.set(-0.1, 0.4, -0.42);
  guitar.scale.setScalar(s);
  inner.rotation.y = 0;
  for (const st of strings) st.amp = 0;
  vibrate(0, 0);
  renderer.render(scene, camera);
  const url = canvas.toDataURL("image/webp", 0.9);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, phone ? 1.25 : 1.5));
  resize();
  cur = null;
  return url;
}
window.__guitar = { scene, camera, renderer, frame: () => renderer.render(scene, camera), still };
