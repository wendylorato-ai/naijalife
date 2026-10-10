"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Engine, Scene, Vector3, Color4, Color3,
  HemisphericLight, DirectionalLight, MeshBuilder,
  StandardMaterial, FollowCamera, Quaternion, Space
} from "@babylonjs/core";

const SKIN_TONES = [
  { id: "deep", hex: "#4a2f1f" }, { id: "rich", hex: "#6b3d28" },
  { id: "warm", hex: "#8d5524" }, { id: "medium", hex: "#b07850" },
  { id: "light", hex: "#d4a574" }
];
const SHIRT_COLORS = [
  { id: "gold", hex: "#c9a227" }, { id: "green", hex: "#1b4332" },
  { id: "blue", hex: "#1a365d" }, { id: "red", hex: "#9b2226" },
  { id: "white", hex: "#e8e4d9" }, { id: "black", hex: "#1a1a1a" }
];
const TROUSER_COLORS = [
  { id: "navy", hex: "#1b2838" }, { id: "black", hex: "#141414" },
  { id: "khaki", hex: "#7a694f" }, { id: "denim", hex: "#2c3e50" },
  { id: "brown", hex: "#4a3728" }
];

const JOBS = [
  { id: "courier", name: "Courier Run", pay: 3500, desc: "Deliver along the avenue", x: -8, z: 25 },
  { id: "shop", name: "Shop Assistant", pay: 5000, desc: "Corner store shift", x: 22, z: -20 },
  { id: "security", name: "Gate Security", pay: 4500, desc: "Estate entrance", x: -30, z: 55 }
];
const PROPERTIES = [
  { id: "studio", name: "Lekki Studio", rent: 12000, desc: "Near the avenue", x: 35, z: 10 },
  { id: "room", name: "Self-Contain", rent: 8000, desc: "Side street", x: -38, z: -40 },
  { id: "shopunit", name: "Shop Unit", rent: 25000, desc: "Roadside business", x: 20, z: 45 }
];
const MISSIONS = [
  { id: "explore", title: "Explore District", desc: "Reach far streets", check: (s) => Math.abs(s.x) > 40 || Math.abs(s.z) > 50, reward: 2000 },
  { id: "work", title: "First Pay", desc: "Complete a job", check: (s) => s.jobsDone >= 1, reward: 1500 },
  { id: "drive", title: "Take a Drive", desc: "Enter a vehicle", check: (s) => s.hasDriven, reward: 2500 },
  { id: "home", title: "Find Shelter", desc: "Rent a place", check: (s) => !!s.homeId, reward: 3000 }
];

function mat(scene, name, color, emissive = null) {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.FromHexString(color);
  if (emissive) m.emissiveColor = Color3.FromHexString(emissive);
  m.specularColor = new Color3(0.08, 0.08, 0.08);
  return m;
}

function aabb(ax, az, aw, ad, bx, bz, bw, bd) {
  return Math.abs(ax - bx) < (aw + bw) * 0.5 && Math.abs(az - bz) < (ad + bd) * 0.5;
}

function buildWorld(scene, appearance) {
  const M = {
    grass: mat(scene, "g", "#2d4a35"),
    road: mat(scene, "r", "#2a2e32"),
    pavement: mat(scene, "p", "#6a6e68"),
    line: mat(scene, "l", "#d4c89a"),
    zebra: mat(scene, "z", "#c8c6bc"),
    glass: mat(scene, "gl", "#4a6a75"),
    concrete: mat(scene, "c", "#9a9080"),
    cream: mat(scene, "cr", "#c4b69a"),
    dark: mat(scene, "d", "#4a524e"),
    roof: mat(scene, "rf", "#3a4240"),
    palm: mat(scene, "pt", "#5c4033"),
    leaf: mat(scene, "lf", "#1e4d2b"),
    lamp: mat(scene, "lp", "#e8c878", "#c9a45a"),
    carBody: mat(scene, "cb", "#2c5f7c"),
    carDark: mat(scene, "cd", "#1a1e22"),
    carRed: mat(scene, "cr2", "#8b3a32"),
    carSilver: mat(scene, "cs", "#8a9094"),
    skin: mat(scene, "sk", appearance.skin),
    shirt: mat(scene, "sh", appearance.shirt),
    trousers: mat(scene, "tr", appearance.trousers),
    hair: mat(scene, "hr", "#1a120e"),
    shoe: mat(scene, "sh2", "#1a1a1a"),
    marker: mat(scene, "mk", "#e7c77f", "#b8943f"),
    npc: mat(scene, "np", "#5a4a3a"),
    sand: mat(scene, "sd", "#a89870"),
    yellow: mat(scene, "yl", "#d9b43a"),
    greenDeep: mat(scene, "gd", "#123c2b"),
    rust: mat(scene, "rs", "#7a3e27"),
    white: mat(scene, "wh", "#eee8d5"),
    blueSign: mat(scene, "bs", "#184b73"),
    redSign: mat(scene, "rss", "#a53d2e")
  };
  const colliders = [];

  // Ground
  const ground = MeshBuilder.CreateGround("gnd", { width: 340, height: 340 }, scene);
  ground.position.y = -0.1; ground.material = M.grass;

  // Main dual carriage-style avenue
  const avenue = MeshBuilder.CreateBox("ave", { width: 16, height: 0.1, depth: 300 }, scene);
  avenue.position.y = 0; avenue.material = M.road;
  for (let z = -140; z <= 140; z += 9) {
    const d = MeshBuilder.CreateBox("dash", { width: 0.2, height: 0.02, depth: 4 }, scene);
    d.position.set(0, 0.06, z); d.material = M.line;
  }
  [-7.6, 7.6].forEach((x) => {
    const e = MeshBuilder.CreateBox("edge", { width: 0.1, height: 0.02, depth: 298 }, scene);
    e.position.set(x, 0.06, 0); e.material = M.line;
  });
  [-10.5, 10.5].forEach((x) => {
    const w = MeshBuilder.CreateBox("sw", { width: 3.2, height: 0.22, depth: 300 }, scene);
    w.position.set(x, 0.05, 0); w.material = M.pavement;
  });

  // Cross streets
  [-110, -75, -40, -10, 20, 55, 90, 120].forEach((z) => {
    const side = MeshBuilder.CreateBox("cross", { width: 240, height: 0.09, depth: 11 }, scene);
    side.position.set(0, -0.01, z); side.material = M.road;
    for (let i = -4; i <= 4; i++) {
      const s = MeshBuilder.CreateBox("zb", { width: 1.15, height: 0.025, depth: 0.5 }, scene);
      s.position.set(i * 1.4, 0.06, z); s.material = M.zebra;
    }
  });

  // Street lights
  for (let z = -130; z <= 130; z += 20) {
    [-13, 13].forEach((x) => {
      const pole = MeshBuilder.CreateCylinder("pole", { height: 6, diameter: 0.14 }, scene);
      pole.position.set(x, 3, z); pole.material = M.dark;
      const arm = MeshBuilder.CreateBox("arm", { width: 1.3, height: 0.08, depth: 0.08 }, scene);
      arm.position.set(x + (x < 0 ? 0.55 : -0.55), 5.8, z); arm.material = M.dark;
      const bulb = MeshBuilder.CreateSphere("bulb", { diameter: 0.32 }, scene);
      bulb.position.set(x + (x < 0 ? 1.0 : -1.0), 5.7, z); bulb.material = M.lamp;
    });
  }

  // Palm trees — denser, more natural clusters
  for (let z = -130; z <= 130; z += 18) {
    [-16.5, 16.5].forEach((x) => {
      const trunk = MeshBuilder.CreateCylinder("palm", { height: 5.2, diameterTop: 0.22, diameterBottom: 0.4, tessellation: 8 }, scene);
      trunk.position.set(x, 2.6, z); trunk.material = M.palm;
      for (let a = 0; a < 7; a++) {
        const frond = MeshBuilder.CreateBox("fr", { width: 0.22, height: 0.08, depth: 4.2 }, scene);
        frond.position.set(x, 5.1, z);
        frond.rotation.y = (a * Math.PI * 2) / 7;
        frond.rotation.x = -0.35;
        frond.material = M.leaf;
      }
      colliders.push({ x, z, hw: 0.5, hd: 0.5 });
    });
  }

  // Buildings — warmer Lagos palette
  const lots = [
    [-28,-95,14,22,13,"cream"],[-46,-88,15,28,15,"glass"],[-29,-62,13,18,11,"concrete"],
    [-47,-50,16,24,14,"cream"],[-28,-28,12,26,14,"glass"],[-46,-12,15,20,12,"concrete"],
    [-29,10,13,22,13,"cream"],[-47,28,14,30,16,"glass"],[-28,55,12,18,11,"concrete"],
    [-46,78,15,24,14,"cream"],[-29,105,13,20,12,"glass"],
    [28,-100,14,24,13,"cream"],[47,-90,15,28,16,"glass"],[29,-65,13,19,12,"concrete"],
    [46,-48,16,25,14,"cream"],[28,-25,12,22,13,"glass"],[47,-8,15,20,12,"concrete"],
    [29,18,13,28,15,"cream"],[46,40,14,22,13,"glass"],[28,68,12,20,12,"concrete"],
    [47,95,15,26,14,"cream"],
    [-72,-70,18,18,13,"concrete"],[-74,-25,20,22,15,"cream"],[-72,30,18,24,14,"glass"],
    [72,-80,18,20,13,"cream"],[74,-20,20,24,15,"glass"],[72,40,18,18,12,"concrete"],
    [-42,130,16,20,13,"glass"],[42,130,16,22,14,"cream"],[-42,-130,15,18,12,"concrete"],[42,-130,15,20,13,"glass"]
  ];
  lots.forEach((lot, i) => {
    const [x, z, w, h, d, kind] = lot;
    const mtl = kind === "glass" ? M.glass : kind === "cream" ? M.cream : M.concrete;
    const b = MeshBuilder.CreateBox("b" + i, { width: w, height: h, depth: d }, scene);
    b.position.set(x, h / 2, z); b.material = mtl;
    const roof = MeshBuilder.CreateBox("br" + i, { width: w + 0.4, height: 0.4, depth: d + 0.4 }, scene);
    roof.position.set(x, h + 0.15, z); roof.material = M.roof;
    // Simple window strips
    const fx = x < 0 ? x + w / 2 + 0.03 : x - w / 2 - 0.03;
    for (let yy = 3; yy < h - 1; yy += 3.2) {
      const win = MeshBuilder.CreateBox("w" + i + yy, { width: 0.06, height: 1.4, depth: d * 0.7 }, scene);
      win.position.set(fx, yy, z); win.material = M.dark;
    }
    colliders.push({ x, z, hw: w / 2 + 0.4, hd: d / 2 + 0.4 });
  });

  // Parked vehicles — slightly better shapes
  const carColors = [M.carRed, M.carBody, M.carDark, M.carSilver];
  for (let i = 0; i < 12; i++) {
    const z = -110 + i * 18;
    const x = i % 2 === 0 ? -5.8 : 5.8;
    const body = MeshBuilder.CreateBox("pk" + i, { width: 2.0, height: 0.75, depth: 4.3 }, scene);
    body.position.set(x, 0.55, z); body.material = carColors[i % 4];
    const cabin = MeshBuilder.CreateBox("pkc" + i, { width: 1.7, height: 0.6, depth: 2.1 }, scene);
    cabin.position.set(x, 1.15, z - 0.2); cabin.material = M.glass;
    colliders.push({ x, z, hw: 1.15, hd: 2.3 });
  }

  // Player driveable car
  const vBody = MeshBuilder.CreateBox("pcar", { width: 2.15, height: 0.8, depth: 4.5 }, scene);
  vBody.position.set(5.2, 0.6, 14); vBody.material = M.carBody;
  const vCabin = MeshBuilder.CreateBox("pcarc", { width: 1.75, height: 0.65, depth: 2.1 }, scene);
  vCabin.parent = vBody; vCabin.position.set(0, 0.65, -0.15); vCabin.material = M.glass;
  const vehicle = { body: vBody, occupied: false };

  // Traffic
  const traffic = [];
  for (let i = 0; i < 5; i++) {
    const body = MeshBuilder.CreateBox("tc" + i, { width: 2.0, height: 0.75, depth: 4.3 }, scene);
    body.position.set(3.5, 0.55, -100 + i * 48); body.material = carColors[(i + 1) % 4];
    const cabin = MeshBuilder.CreateBox("tcc" + i, { width: 1.7, height: 0.6, depth: 2.1 }, scene);
    cabin.position.set(3.5, 1.15, -100 + i * 48 - 0.2); cabin.material = M.glass;
    traffic.push({ body, cabin, z: body.position.z, speed: 5.5 + i * 0.5 });
  }

  // Nigerian/Lagos street dressing — deliberately built from simple, mobile-friendly meshes.
  // The final project can swap these for CC0 packs without changing gameplay code.
  function addSign(text, x, z, colorMat, rot = 0) {
    const board = MeshBuilder.CreateBox("sign_" + text.replace(/\W/g, ""), { width: 3.8, height: 1.0, depth: 0.12 }, scene);
    board.position.set(x, 2.2, z); board.rotation.y = rot; board.material = colorMat;
    return board;
  }
  addSign("SHOP", -20, -18, M.blueSign, Math.PI / 2);
  addSign("MAMA PUT", 20, 34, M.redSign, -Math.PI / 2);
  addSign("PHARMACY", -20, 72, M.greenDeep, Math.PI / 2);
  addSign("MYNAIJALIFE", 20, -72, M.yellow, -Math.PI / 2);

  // Roadside kiosks / shops
  [[-20,-18],[20,34],[-20,72],[20,-72]].forEach(([x,z],i)=>{
    const shop = MeshBuilder.CreateBox("kiosk"+i,{width:5,height:2.5,depth:3.2},scene);
    shop.position.set(x,1.25,z); shop.material = i%2 ? M.cream : M.concrete;
    const awning = MeshBuilder.CreateBox("awning"+i,{width:5.4,height:.16,depth:1.1},scene);
    awning.position.set(x,2.35,z + (i%2 ? -1.15 : 1.15)); awning.material = i%2 ? M.yellow : M.greenDeep;
    colliders.push({x,z,hw:2.7,hd:1.8});
  });

  // Open drainage channels along the sidewalks.
  [-13.0, 13.0].forEach(x=>{
    const drain=MeshBuilder.CreateBox("drain",{width:0.65,height:0.18,depth:298},scene);
    drain.position.set(x,0.02,0); drain.material=M.dark;
    for(let z=-140;z<140;z+=4){
      const slab=MeshBuilder.CreateBox("slab",{width:0.82,height:0.06,depth:1.0},scene);
      slab.position.set(x,0.14,z); slab.material=M.pavement;
    }
  });

  // Utility poles + overhead lines — a strong Nigerian street cue.
  for(let z=-120;z<=120;z+=30){
    const pole=MeshBuilder.CreateCylinder("utilpole",{height:7,diameter:0.18,tessellation:8},scene);
    pole.position.set(-18,3.5,z); pole.material=M.dark;
    const cross=MeshBuilder.CreateBox("crossarm",{width:2.6,height:0.12,depth:0.12},scene);
    cross.position.set(-18,6.7,z); cross.material=M.dark;
  }
  const wireMat=mat(scene,"wire","#202326");
  for(const y of [6.55,6.8]){
    const wire=MeshBuilder.CreateTube("wire",{path:[new Vector3(-18,y,-135),new Vector3(-18,y,135)],radius:0.025},scene);
    wire.material=wireMat;
  }

  // Water tanks on selected rooftops.
  [[-28,-95],[47,-8],[-46,78]].forEach(([x,z],i)=>{
    const tank=MeshBuilder.CreateCylinder("tank"+i,{height:1.4,diameter:1.5},scene);
    tank.position.set(x,15,z); tank.material=M.blueSign;
    const stand=MeshBuilder.CreateBox("tankstand"+i,{width:1.3,height:1.5,depth:1.3},scene);
    stand.position.set(x,14.0,z); stand.material=M.dark;
  });

  // Lagos danfo-style minibus: yellow body + dark lower trim.
  function makeDanfo(name,x,z,rot=0){
    const root=MeshBuilder.CreateBox(name,{width:2.15,height:1.25,depth:4.8},scene);
    root.position.set(x,0.8,z); root.rotation.y=rot; root.material=M.yellow;
    const lower=MeshBuilder.CreateBox(name+"lower",{width:2.2,height:.35,depth:4.85},scene);
    lower.parent=root; lower.position.set(0,-.35,0); lower.material=M.greenDeep;
    const glass=MeshBuilder.CreateBox(name+"glass",{width:1.82,height:.65,depth:2.35},scene);
    glass.parent=root; glass.position.set(0,.58,-.25); glass.material=M.glass;
    return root;
  }
  makeDanfo("danfo1",-5.6,-48,0);
  makeDanfo("danfo2",5.6,88,Math.PI);
  makeDanfo("danfo3",3.5,-125,0);

  // Roadside market tables / produce baskets.
  [[-17,-2],[17,12],[-17,45],[17,58]].forEach(([x,z],i)=>{
    const table=MeshBuilder.CreateBox("market"+i,{width:2.4,height:.75,depth:1.2},scene);
    table.position.set(x,.45,z); table.material=M.rust;
    const crate=MeshBuilder.CreateBox("crate"+i,{width:1.1,height:.35,depth:.8},scene);
    crate.position.set(x,.98,z); crate.material=M.yellow;
  });

  // Markers
  const markers = [];
  JOBS.forEach((j) => {
    const m = MeshBuilder.CreateCylinder("j" + j.id, { height: 2.4, diameter: 0.45 }, scene);
    m.position.set(j.x, 1.2, j.z); m.material = M.marker;
    markers.push({ mesh: m, type: "job", id: j.id, x: j.x, z: j.z });
  });
  PROPERTIES.forEach((p) => {
    const m = MeshBuilder.CreateBox("pr" + p.id, { width: 0.55, height: 2.4, depth: 0.55 }, scene);
    m.position.set(p.x, 1.2, p.z); m.material = M.lamp;
    markers.push({ mesh: m, type: "property", id: p.id, x: p.x, z: p.z });
  });

  // NPCs
  const npcs = [];
  const npcSkins = ["#5a3827","#6b3d28","#8d5524","#4a2f1f"];
  const npcShirts = ["#f0eee4","#1b4332","#c9a227","#7b2638"];
  for (let i = 0; i < 10; i++) {
    const root = MeshBuilder.CreateTransformNode("npc" + i, scene);
    root.position.set(i % 2 === 0 ? -9.5 : 9.5, 0, -58 + i * 13);
    const body=MeshBuilder.CreateCapsule("npcbody"+i,{height:1.15,radius:.24},scene);
    body.parent=root; body.position.y=.78; body.material=mat(scene,"nps"+i,npcShirts[i%npcShirts.length]);
    const head=MeshBuilder.CreateSphere("npchead"+i,{diameter:.34,segments:10},scene);
    head.parent=root; head.position.y=1.62; head.material=mat(scene,"nph"+i,npcSkins[i%npcSkins.length]);
    npcs.push({ mesh: root, z: root.position.z, speed: 1.1 + (i % 3) * 0.3, dir: i % 2 === 0 ? 1 : -1 });
  }

  // ── Improved humanoid character (still procedural, better proportions) ──
  const player = MeshBuilder.CreateCapsule("player", { height: 1.75, radius: 0.22 }, scene);
  player.position.set(-3, 0.9, 10);
  player.visibility = 0;
  player.isPickable = false;

  // Hip root for animation
  const hip = MeshBuilder.CreateBox("hip", { width: 0.01, height: 0.01, depth: 0.01 }, scene);
  hip.parent = player; hip.position.set(0, -0.15, 0); hip.visibility = 0;

  const torso = MeshBuilder.CreateBox("torso", { width: 0.42, height: 0.55, depth: 0.24 }, scene);
  torso.parent = player; torso.position.set(0, 0.15, 0); torso.material = M.shirt;

  const head = MeshBuilder.CreateSphere("head", { diameter: 0.28, segments: 12 }, scene);
  head.parent = player; head.position.set(0, 0.58, 0); head.material = M.skin;
  head.scaling.y = 1.1;

  const hair = MeshBuilder.CreateSphere("hair", { diameter: 0.3, segments: 10 }, scene);
  hair.parent = head; hair.position.set(0, 0.06, -0.02); hair.material = M.hair;
  hair.scaling.set(1.05, 0.7, 1.05);

  const legL = MeshBuilder.CreateBox("legL", { width: 0.14, height: 0.55, depth: 0.16 }, scene);
  legL.parent = player; legL.position.set(-0.11, -0.55, 0); legL.material = M.trousers;
  const legR = MeshBuilder.CreateBox("legR", { width: 0.14, height: 0.55, depth: 0.16 }, scene);
  legR.parent = player; legR.position.set(0.11, -0.55, 0); legR.material = M.trousers;

  const shoeL = MeshBuilder.CreateBox("shoeL", { width: 0.15, height: 0.08, depth: 0.22 }, scene);
  shoeL.parent = legL; shoeL.position.set(0, -0.3, 0.03); shoeL.material = M.shoe;
  const shoeR = MeshBuilder.CreateBox("shoeR", { width: 0.15, height: 0.08, depth: 0.22 }, scene);
  shoeR.parent = legR; shoeR.position.set(0, -0.3, 0.03); shoeR.material = M.shoe;

  const armL = MeshBuilder.CreateBox("armL", { width: 0.11, height: 0.48, depth: 0.11 }, scene);
  armL.parent = player; armL.position.set(-0.3, 0.05, 0); armL.material = M.skin;
  const armR = MeshBuilder.CreateBox("armR", { width: 0.11, height: 0.48, depth: 0.11 }, scene);
  armR.parent = player; armR.position.set(0.3, 0.05, 0); armR.material = M.skin;

  player.rotationQuaternion = Quaternion.Identity();

  // Lighting — warmer Lagos afternoon
  scene.clearColor = new Color4(0.55, 0.68, 0.75, 1);
  const hemi = new HemisphericLight("h", new Vector3(0.2, 1, 0.1), scene);
  hemi.intensity = 0.9;
  hemi.groundColor = new Color3(0.28, 0.25, 0.2);
  const sun = new DirectionalLight("sun", new Vector3(-0.4, -1, 0.3), scene);
  sun.position = new Vector3(50, 80, -30);
  sun.intensity = 1.35;

  const camera = new FollowCamera("cam", new Vector3(0, 4, -8), scene);
  camera.lockedTarget = player;
  camera.radius = 7;
  camera.heightOffset = 2.4;
  camera.rotationOffset = 180;
  camera.cameraAcceleration = 0.1;
  camera.maxCameraSpeed = 20;
  camera.lowerRadiusLimit = 4;
  camera.upperRadiusLimit = 16;
  // Custom game controls handle movement/turning; do not attach Babylon camera controls here.

  return {
    player, camera, traffic, colliders, vehicle, markers, npcs,
    parts: { head, torso, legL, legR, armL, armR, hair }
  };
}

export default function Home() {
  const [phase, setPhase] = useState("intro");
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [help, setHelp] = useState(true);
  const [coords, setCoords] = useState({ x: -3, z: 10 });
  const [paused, setPaused] = useState(false);
  const [locationName, setLocationName] = useState("LEKKI AVENUE");
  const [charName, setCharName] = useState("Player");
  const [skinId, setSkinId] = useState("warm");
  const [shirtId, setShirtId] = useState("gold");
  const [trouserId, setTrouserId] = useState("navy");
  const [cash, setCash] = useState(25000);
  const [jobsDone, setJobsDone] = useState(0);
  const [hasDriven, setHasDriven] = useState(false);
  const [homeId, setHomeId] = useState(null);
  const [missionDone, setMissionDone] = useState({});
  const [panel, setPanel] = useState(null);
  const [prompt, setPrompt] = useState(null);
  const [toast, setToast] = useState(null);
  const [driving, setDriving] = useState(false);

  const engineRef = useRef(null);
  const playerRef = useRef(null);
  const partsRef = useRef(null);
  const trafficRef = useRef([]);
  const collidersRef = useRef([]);
  const vehicleRef = useRef(null);
  const markersRef = useRef([]);
  const npcsRef = useRef([]);
  const cameraRef = useRef(null);
  const keysRef = useRef(new Set());
  const mobileKeysRef = useRef(new Set());
  const runningRef = useRef(false);
  const pausedRef = useRef(false);
  const drivingRef = useRef(false);
  const facingRef = useRef(0); // radians, character yaw
  const walkPhaseRef = useRef(0);
  const statsRef = useRef({ x: -3, z: 10, jobsDone: 0, hasDriven: false, homeId: null });

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { drivingRef.current = driving; }, [driving]);
  useEffect(() => {
    statsRef.current = { x: coords.x, z: coords.z, jobsDone, hasDriven, homeId };
  }, [coords, jobsDone, hasDriven, homeId]);

  useEffect(() => {
    if (phase !== "intro") return;
    const t = setTimeout(() => setPhase("login"), 2000);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "world") return;
    const s = statsRef.current;
    MISSIONS.forEach((m) => {
      if (!missionDone[m.id] && m.check(s)) {
        setMissionDone((prev) => ({ ...prev, [m.id]: true }));
        setCash((c) => c + m.reward);
        setToast(`Mission: ${m.title} (+₦${m.reward.toLocaleString()})`);
        setTimeout(() => setToast(null), 2500);
      }
    });
  }, [coords, jobsDone, hasDriven, homeId, phase, missionDone]);

  const appearance = {
    skin: SKIN_TONES.find((s) => s.id === skinId)?.hex || "#8d5524",
    shirt: SHIRT_COLORS.find((s) => s.id === shirtId)?.hex || "#c9a227",
    trousers: TROUSER_COLORS.find((s) => s.id === trouserId)?.hex || "#1b2838"
  };

  const updateLocation = useCallback((x, z) => {
    if (Math.abs(x) < 10) {
      if (z > 60) setLocationName("IKEJA NORTH");
      else if (z < -60) setLocationName("IKEJA SOUTH");
      else setLocationName("IKEJA • LAGOS");
    } else if (x < -10) setLocationName(z > 40 ? "NORTH-WEST" : z < -40 ? "SOUTH-WEST" : "WEST STREETS");
    else setLocationName(z > 40 ? "NORTH-EAST" : z < -40 ? "SOUTH-EAST" : "EAST STREETS");
  }, []);

  useEffect(() => {
    if (phase !== "world" || !canvasRef.current || engineRef.current) return;

    const engine = new Engine(canvasRef.current, true, { antialias: true, stencil: true, adaptToDeviceRatio: true });
    const scene = new Scene(engine);
    const world = buildWorld(scene, appearance);

    engineRef.current = engine;
    playerRef.current = world.player;
    partsRef.current = world.parts;
    trafficRef.current = world.traffic;
    collidersRef.current = world.colliders;
    vehicleRef.current = world.vehicle;
    markersRef.current = world.markers;
    npcsRef.current = world.npcs;
    cameraRef.current = world.camera;
    facingRef.current = 0;

    const keys = keysRef.current;
    const mobileKeys = mobileKeysRef.current;

    const down = (e) => {
      const k = e.key.toLowerCase();
      keys.add(k);
      if (k === "shift") runningRef.current = true;
      if (k === "escape") setPaused((p) => !p);
      if (k === "e") tryInteract();
      if (k === "f") tryVehicle();
    };
    const up = (e) => {
      const k = e.key.toLowerCase();
      keys.delete(k);
      if (k === "shift") runningRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    function tryVehicle() {
      const v = vehicleRef.current;
      const p = playerRef.current;
      if (!v || !p) return;
      if (drivingRef.current) {
        drivingRef.current = false;
        setDriving(false);
        v.occupied = false;
        const parts = partsRef.current;
        if (parts) Object.values(parts).forEach((m) => { m.isVisible = true; });
        p.position.x = v.body.position.x + 2.2;
        p.position.z = v.body.position.z;
        p.position.y = 0.9;
        cameraRef.current.lockedTarget = p;
        cameraRef.current.radius = 7;
        cameraRef.current.heightOffset = 2.4;
        setPrompt(null);
        return;
      }
      const dist = Math.hypot(p.position.x - v.body.position.x, p.position.z - v.body.position.z);
      if (dist < 4.5) {
        drivingRef.current = true;
        setDriving(true);
        setHasDriven(true);
        v.occupied = true;
        const parts = partsRef.current;
        if (parts) Object.values(parts).forEach((m) => { m.isVisible = false; });
        cameraRef.current.lockedTarget = v.body;
        cameraRef.current.radius = 11;
        cameraRef.current.heightOffset = 3.5;
        setToast("Driving — steer with pad / WASD · F exit");
        setTimeout(() => setToast(null), 2500);
      }
    }

    function tryInteract() {
      if (drivingRef.current) return;
      const p = playerRef.current;
      if (!p) return;
      for (const mk of markersRef.current) {
        if (Math.hypot(p.position.x - mk.x, p.position.z - mk.z) < 4) {
          setPanel(mk.type === "job" ? "jobs" : "properties");
          return;
        }
      }
    }

    let last = performance.now();
    const BOUND = 150;
    const pr = 0.4;
    const TURN_SPEED = 2.6;

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (!pausedRef.current) {
        const allKeys = new Set([...keys, ...mobileKeys]);

        // Turning (Q/E, arrow left/right when not strafing priority, mobile turn buttons)
        let turn = 0;
        if (allKeys.has("q") || allKeys.has("turnleft")) turn -= 1;
        if (allKeys.has("e") || allKeys.has("turnright")) turn += 1;
        // Also allow A/D as strafe OR turn — use dedicated turn on mobile; on desktop A/D strafe relative to facing

        if (drivingRef.current) {
          const v = vehicleRef.current;
          if (v) {
            let steer = 0, throttle = 0;
            if (allKeys.has("a") || allKeys.has("arrowleft") || allKeys.has("turnleft")) steer -= 1;
            if (allKeys.has("d") || allKeys.has("arrowright") || allKeys.has("turnright")) steer += 1;
            if (allKeys.has("w") || allKeys.has("arrowup")) throttle += 1;
            if (allKeys.has("s") || allKeys.has("arrowdown")) throttle -= 1;
            const speed = (allKeys.has("run") || runningRef.current ? 26 : 15) * throttle;
            v.body.rotation.y += steer * 1.8 * dt;
            const yaw = v.body.rotation.y;
            v.body.position.x += Math.sin(yaw) * speed * dt;
            v.body.position.z += Math.cos(yaw) * speed * dt;
            v.body.position.x = Math.max(-BOUND, Math.min(BOUND, v.body.position.x));
            v.body.position.z = Math.max(-BOUND, Math.min(BOUND, v.body.position.z));
            setCoords({ x: Math.round(v.body.position.x), z: Math.round(v.body.position.z) });
            updateLocation(v.body.position.x, v.body.position.z);
            cameraRef.current.rotationOffset = 180;
          }
        } else {
          // On foot: turn then move relative to facing
          if (turn !== 0) {
            facingRef.current += turn * TURN_SPEED * dt;
          }

          let forward = 0, strafe = 0;
          if (allKeys.has("w") || allKeys.has("arrowup")) forward += 1;
          if (allKeys.has("s") || allKeys.has("arrowdown")) forward -= 1;
          if (allKeys.has("a") || allKeys.has("arrowleft")) strafe -= 1;
          if (allKeys.has("d") || allKeys.has("arrowright")) strafe += 1;

          const isRunning = runningRef.current || allKeys.has("run");
          const speed = isRunning ? 11 : 5.5;
          const yaw = facingRef.current;
          const p = playerRef.current;

          // Apply facing to mesh
          p.rotation.y = yaw;
          cameraRef.current.rotationOffset = 180;

          let mx = 0, mz = 0;
          if (forward || strafe) {
            // Relative to facing: forward along yaw, strafe perpendicular
            mx = Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
            mz = Math.cos(yaw) * forward - Math.sin(yaw) * strafe;
            const len = Math.hypot(mx, mz) || 1;
            mx = (mx / len) * speed * dt;
            mz = (mz / len) * speed * dt;
          }

          if (mx || mz) {
            let fx = p.position.x + mx;
            let fz = p.position.z + mz;
            const cols = collidersRef.current;
            let hitX = false, hitZ = false;
            for (const c of cols) {
              if (aabb(fx, p.position.z, pr * 2, pr * 2, c.x, c.z, c.hw * 2, c.hd * 2)) hitX = true;
              if (aabb(hitX ? p.position.x : fx, fz, pr * 2, pr * 2, c.x, c.z, c.hw * 2, c.hd * 2)) hitZ = true;
            }
            if (hitX) fx = p.position.x;
            if (hitZ) fz = p.position.z;
            fx = Math.max(-BOUND, Math.min(BOUND, fx));
            fz = Math.max(-BOUND, Math.min(BOUND, fz));
            p.position.x = fx;
            p.position.z = fz;
            setCoords({ x: Math.round(fx), z: Math.round(fz) });
            updateLocation(fx, fz);

            // Walk anim
            const parts = partsRef.current;
            if (parts) {
              walkPhaseRef.current += dt * (isRunning ? 13 : 8);
              const swing = Math.sin(walkPhaseRef.current) * (isRunning ? 0.5 : 0.32);
              parts.legL.rotation.x = swing;
              parts.legR.rotation.x = -swing;
              parts.armL.rotation.x = -swing * 0.75;
              parts.armR.rotation.x = swing * 0.75;
            }
          } else {
            const parts = partsRef.current;
            if (parts) {
              parts.legL.rotation.x *= 0.8;
              parts.legR.rotation.x *= 0.8;
              parts.armL.rotation.x *= 0.8;
              parts.armR.rotation.x *= 0.8;
            }
          }

          // Prompts
          const v = vehicleRef.current;
          let near = null;
          if (v && Math.hypot(p.position.x - v.body.position.x, p.position.z - v.body.position.z) < 4.5) {
            near = "F · Enter vehicle";
          } else {
            for (const mk of markersRef.current) {
              if (Math.hypot(p.position.x - mk.x, p.position.z - mk.z) < 4) {
                near = mk.type === "job" ? "E · Job" : "E · Property";
                break;
              }
            }
          }
          setPrompt(near);
        }

        trafficRef.current.forEach((car) => {
          car.z += car.speed * dt;
          if (car.z > 145) car.z = -145;
          car.body.position.z = car.z;
          car.cabin.position.z = car.z - 0.2;
        });
        npcsRef.current.forEach((n) => {
          n.z += n.speed * n.dir * dt;
          if (n.z > 125) n.dir = -1;
          if (n.z < -125) n.dir = 1;
          n.mesh.position.z = n.z;
          n.mesh.rotation.y = n.dir > 0 ? 0 : Math.PI;
        });
      }
      scene.render();
    };

    engine.runRenderLoop(tick);
    const resize = () => engine.resize();
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    setReady(true);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
      engine.stopRenderLoop(tick);
      scene.dispose();
      engine.dispose();
      engineRef.current = null;
    };
  }, [phase, updateLocation]);

  function doJob(job) {
    setCash((c) => c + job.pay);
    setJobsDone((n) => n + 1);
    setToast(`+₦${job.pay.toLocaleString()} · ${job.name}`);
    setTimeout(() => setToast(null), 2500);
    setPanel(null);
  }
  function rentProperty(prop) {
    if (cash < prop.rent) {
      setToast("Not enough cash");
      setTimeout(() => setToast(null), 2000);
      return;
    }
    setCash((c) => c - prop.rent);
    setHomeId(prop.id);
    setToast(`Rented: ${prop.name}`);
    setTimeout(() => setToast(null), 2500);
    setPanel(null);
  }

  function padDown(k) { mobileKeysRef.current.add(k); }
  function padUp(k) { mobileKeysRef.current.delete(k); }

  if (phase === "intro") {
    return (
      <main className="intro">
        <div className="intro-glow" />
        <div className="logo-mark">NL</div>
        <div className="brand">NAIJALIFE</div>
        <div className="tagline">YOUR LIFE. YOUR CITY. YOUR STORY.</div>
        <div className="loading"><span /> LOADING YOUR WORLD</div>
      </main>
    );
  }
  if (phase === "login") {
    return (
      <main className="login">
        <div className="login-bg" />
        <section className="login-card">
          <div className="mini-logo">NL</div>
          <p className="eyebrow">WELCOME TO</p>
          <h1>NAIJALIFE</h1>
          <p className="copy">Create your character, explore Lekki, work, drive, and build your story.</p>
          <button onClick={() => setPhase("creator")}>CREATE CHARACTER →</button>
          <small>v1.1.0-alpha · Fullscreen · Turn controls</small>
        </section>
      </main>
    );
  }
  if (phase === "creator") {
    return (
      <main className="creator">
        <div className="creator-card">
          <h1>YOUR CHARACTER</h1>
          <p className="sub">CHOOSE YOUR LOOK</p>
          <div className="creator-preview" style={{ background: `linear-gradient(180deg, ${appearance.skin} 40%, ${appearance.shirt} 40% 70%, ${appearance.trousers} 70%)` }} />
          <div className="creator-field">
            <label>NAME</label>
            <input type="text" maxLength={16} value={charName} onChange={(e) => setCharName(e.target.value.slice(0, 16))} />
          </div>
          <div className="creator-field">
            <label>SKIN</label>
            <div className="swatch-row">
              {SKIN_TONES.map((s) => (
                <button key={s.id} type="button" className={`swatch${skinId === s.id ? " selected" : ""}`} style={{ background: s.hex }} onClick={() => setSkinId(s.id)} />
              ))}
            </div>
          </div>
          <div className="creator-field">
            <label>SHIRT</label>
            <div className="swatch-row">
              {SHIRT_COLORS.map((s) => (
                <button key={s.id} type="button" className={`swatch${shirtId === s.id ? " selected" : ""}`} style={{ background: s.hex }} onClick={() => setShirtId(s.id)} />
              ))}
            </div>
          </div>
          <div className="creator-field">
            <label>TROUSERS</label>
            <div className="swatch-row">
              {TROUSER_COLORS.map((s) => (
                <button key={s.id} type="button" className={`swatch${trouserId === s.id ? " selected" : ""}`} style={{ background: s.hex }} onClick={() => setTrouserId(s.id)} />
              ))}
            </div>
          </div>
          <div className="creator-actions">
            <button type="button" className="secondary" onClick={() => setPhase("login")}>BACK</button>
            <button type="button" className="primary" onClick={() => { setPhase("entering"); setTimeout(() => setPhase("world"), 1200); }}>ENTER CITY</button>
          </div>
        </div>
      </main>
    );
  }
  if (phase === "entering") {
    return (
      <main className="transition">
        <div className="transition-ring" />
        <h1>ENTERING LEKKI</h1>
        <p>Welcome, {charName || "Player"}...</p>
      </main>
    );
  }

  const missionsComplete = MISSIONS.filter((m) => missionDone[m.id]).length;

  return (
    <main className="world-screen">
      <div className="game-stage">
        <canvas ref={canvasRef} className="world-canvas" aria-label="NaijaLife" />
        {!ready && <div className="loading-world">BUILDING CITY...</div>}

        <div className="hud-top">
          <a className="wordmark" href="#" onClick={(e) => e.preventDefault()}>NAIJALIFE</a>
          <div className="hud-place">
            <span className="live-dot" />
            <span className="hud-name">{charName || "Player"}</span>
            <small>{driving ? "DRIVING" : "ON FOOT"} · {locationName}</small>
          </div>
          <div className="hud-money">₦{cash.toLocaleString()}<small>CASH</small></div>
        </div>

        <div className="location-chip">
          <span>⌖</span> {locationName}
          <small>X {coords.x} · Z {coords.z}{homeId ? " · HOME" : ""}</small>
        </div>

        <div className="mission-chip">
          <small>MISSIONS {missionsComplete}/{MISSIONS.length}</small>
          <strong>{MISSIONS.find((m) => !missionDone[m.id])?.title || "All done"}</strong>
          <span>{MISSIONS.find((m) => !missionDone[m.id])?.desc || "Explore freely"}</span>
        </div>

        <div className="controls-help">
          <strong>{driving ? "DRIVE" : "MOVE + TURN"}</strong>
          <span>WASD move · Q/E turn</span>
          <span>F vehicle · E interact</span>
          <div className="hud-actions">
            <button onClick={() => setPanel("jobs")}>JOBS</button>
            <button onClick={() => setPanel("properties")}>HOME</button>
            <button onClick={() => setPanel("missions")}>TASKS</button>
            <button onClick={() => setPanel("wallet")}>WALLET</button>
          </div>
          <button onClick={() => setHelp(!help)}>{help ? "HIDE" : "PAD"}</button>
          <button onClick={() => setPaused(!paused)}>{paused ? "RESUME" : "PAUSE"}</button>
        </div>

        {help && (
          <div className="mobile-pad">
            <button onPointerDown={() => padDown("w")} onPointerUp={() => padUp("w")} onPointerLeave={() => padUp("w")} onPointerCancel={() => padUp("w")}>▲</button>
            <div className="pad-row">
              <button onPointerDown={() => padDown("a")} onPointerUp={() => padUp("a")} onPointerLeave={() => padUp("a")} onPointerCancel={() => padUp("a")}>◀</button>
              <button onPointerDown={() => padDown("s")} onPointerUp={() => padUp("s")} onPointerLeave={() => padUp("s")} onPointerCancel={() => padUp("s")}>▼</button>
              <button onPointerDown={() => padDown("d")} onPointerUp={() => padUp("d")} onPointerLeave={() => padUp("d")} onPointerCancel={() => padUp("d")}>▶</button>
            </div>
            <div className="turn-row">
              <button className="turn-btn" onPointerDown={() => padDown("turnleft")} onPointerUp={() => padUp("turnleft")} onPointerLeave={() => padUp("turnleft")} onPointerCancel={() => padUp("turnleft")}>↺ L</button>
              <button className="run-btn" onPointerDown={() => { padDown("run"); runningRef.current = true; }} onPointerUp={() => { padUp("run"); runningRef.current = false; }} onPointerLeave={() => { padUp("run"); runningRef.current = false; }} onPointerCancel={() => { padUp("run"); runningRef.current = false; }}>RUN</button>
              <button className="turn-btn" onPointerDown={() => padDown("turnright")} onPointerUp={() => padUp("turnright")} onPointerLeave={() => padUp("turnright")} onPointerCancel={() => padUp("turnright")}>R ↻</button>
            </div>
            <div className="turn-row">
              <button className="turn-btn" onPointerDown={() => padDown("f")} onPointerUp={() => padUp("f")} onClick={() => {
                // trigger vehicle via key simulation
                const ev = new KeyboardEvent("keydown", { key: "f" });
                window.dispatchEvent(ev);
                setTimeout(() => window.dispatchEvent(new KeyboardEvent("keyup", { key: "f" })), 50);
              }}>CAR</button>
              <button className="turn-btn" onClick={() => {
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "e" }));
                setTimeout(() => window.dispatchEvent(new KeyboardEvent("keyup", { key: "e" })), 50);
              }}>USE</button>
            </div>
          </div>
        )}

        {prompt && <div className="interact-prompt">{prompt}</div>}
        {toast && <div className="toast">{toast}</div>}

        {paused && (
          <div className="pause-overlay">
            <div className="pause-card">
              <h2>PAUSED</h2>
              <p>{charName} · ₦{cash.toLocaleString()}</p>
              <button onClick={() => setPaused(false)}>RESUME</button>
            </div>
          </div>
        )}

        {panel === "jobs" && (
          <div className="panel-overlay" onClick={() => setPanel(null)}>
            <div className="panel" onClick={(e) => e.stopPropagation()}>
              <h2>JOBS</h2>
              <p className="panel-sub">GOLD MARKERS · TAP TO WORK</p>
              <div className="panel-list">
                {JOBS.map((j) => (
                  <div className="panel-item" key={j.id}>
                    <div><strong>{j.name}</strong><span>{j.desc}</span></div>
                    <button onClick={() => doJob(j)}>₦{j.pay.toLocaleString()}</button>
                  </div>
                ))}
              </div>
              <button className="panel-close" onClick={() => setPanel(null)}>CLOSE</button>
            </div>
          </div>
        )}
        {panel === "properties" && (
          <div className="panel-overlay" onClick={() => setPanel(null)}>
            <div className="panel" onClick={(e) => e.stopPropagation()}>
              <h2>PROPERTIES</h2>
              <p className="panel-sub">RENT WITH YOUR CASH</p>
              <div className="panel-list">
                {PROPERTIES.map((p) => (
                  <div className="panel-item" key={p.id}>
                    <div><strong>{p.name}{homeId === p.id ? " ✓" : ""}</strong><span>{p.desc}</span></div>
                    <button disabled={homeId === p.id || cash < p.rent} onClick={() => rentProperty(p)}>
                      {homeId === p.id ? "RENTED" : `₦${p.rent.toLocaleString()}`}
                    </button>
                  </div>
                ))}
              </div>
              <button className="panel-close" onClick={() => setPanel(null)}>CLOSE</button>
            </div>
          </div>
        )}
        {panel === "missions" && (
          <div className="panel-overlay" onClick={() => setPanel(null)}>
            <div className="panel" onClick={(e) => e.stopPropagation()}>
              <h2>MISSIONS</h2>
              <p className="panel-sub">{missionsComplete}/{MISSIONS.length} DONE</p>
              <div className="panel-list">
                {MISSIONS.map((m) => (
                  <div className="panel-item" key={m.id}>
                    <div><strong>{missionDone[m.id] ? "✓ " : ""}{m.title}</strong><span>{m.desc} · ₦{m.reward.toLocaleString()}</span></div>
                  </div>
                ))}
              </div>
              <button className="panel-close" onClick={() => setPanel(null)}>CLOSE</button>
            </div>
          </div>
        )}
        {panel === "wallet" && (
          <div className="panel-overlay" onClick={() => setPanel(null)}>
            <div className="panel" onClick={(e) => e.stopPropagation()}>
              <h2>WALLET</h2>
              <div className="panel-list">
                <div className="panel-item"><div><strong>Balance</strong></div><strong>₦{cash.toLocaleString()}</strong></div>
                <div className="panel-item"><div><strong>Jobs done</strong></div><strong>{jobsDone}</strong></div>
                <div className="panel-item"><div><strong>Home</strong></div><strong>{homeId ? PROPERTIES.find((p) => p.id === homeId)?.name : "None"}</strong></div>
              </div>
              <button className="panel-close" onClick={() => setPanel(null)}>CLOSE</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
