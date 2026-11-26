// Copia o Three.js (ESM) para public/vendor/three, servido como arquivo estático pela landing (sem CDN).
import { cpSync, mkdirSync, existsSync } from "node:fs";
const src = "node_modules/three";
if (!existsSync(src)) process.exit(0);
const out = "public/vendor/three";
mkdirSync(out, { recursive: true });
cpSync(`${src}/build/three.module.min.js`, `${out}/three.module.min.js`);
cpSync(`${src}/examples/jsm/environments/RoomEnvironment.js`, `${out}/RoomEnvironment.js`);
cpSync(`${src}/LICENSE`, `${out}/LICENSE`);
// carregador de modelos glTF (usado só se existir public/landing/guitar.glb)
mkdirSync(`${out}/addons/loaders`, { recursive: true });
mkdirSync(`${out}/addons/utils`, { recursive: true });
cpSync(`${src}/examples/jsm/loaders/GLTFLoader.js`, `${out}/addons/loaders/GLTFLoader.js`);
cpSync(`${src}/examples/jsm/utils/BufferGeometryUtils.js`, `${out}/addons/utils/BufferGeometryUtils.js`);
console.log("three copiado para", out);
