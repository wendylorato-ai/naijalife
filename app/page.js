"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Engine, Scene, Vector3, Color4, Color3,
  HemisphericLight, DirectionalLight, MeshBuilder,
  StandardMaterial, FollowCamera, Quaternion
} from "@babylonjs/core";

const SKIN_TONES = [
  { id: "deep", hex: "#5c3a24" }, { id: "rich", hex: "#7a4a2e" },
  { id: "warm", hex: "#9b6545" }, { id: "medium", hex: "#b8835a" },
  { id: "light", hex: "#d4a574" }
];
const SHIRT_COLORS = [
  { id: "gold", hex: "#d2a95c" }, { id: "green", hex: "#2d6a4f" },
  { id: "blue", hex: "#1d4e89" }, { id: "red", hex: "#9b2226" },
  { id: "white", hex: "#e8e6df" }, { id: "black", hex: "#1a1a1a" }
];
const TROUSER_COLORS = [
  { id: "navy", hex: "#283c4b" }, { id: "black", hex: "#1c1c1c" },
  { id: "khaki", hex: "#8b7355" }, { id: "denim", hex: "#3d5a80" },
  { id: "brown", hex: "#5c4033" }
];

const JOBS = [
  { id: "courier", name: "Okada / Courier Run", pay: 3500, desc: "Deliver parcels along the avenue", x: -8, z: 25 },
  { id: "shop", name: "Shop Assistant", pay: 5000, desc: "Help at the corner store", x: 22, z: -20 },
  { id: "security", name: "Gate Security", pay: 4500, desc: "Watch the estate entrance", x: -30, z: 55 }
];

const PROPERTIES = [
  { id: "studio", name: "Lekki Studio Flat", rent: 12000, desc: "Small but close to the avenue", x: 35, z: 10 },
  { id: "room", name: "Self-Contain Room", rent: 8000, desc: "Affordable side-street room", x: -38, z: -40 },
  { id: "shopunit", name: "Roadside Shop Unit", rent: 25000, desc: "Start a small business here", x: 20, z: 45 }
];

const MISSIONS = [
  { id: "explore", title: "Explore the District", desc: "Walk past X±40 or Z±50", check: (s) => Math.abs(s.x) > 40 || Math.abs(s.z) > 50, reward: 2000 },
  { id: "work", title: "Earn Your First Pay", desc: "Complete any job once", check: (s) => s.jobsDone >= 1, reward: 1500 },
  { id: "drive", title: "Take a Drive", desc: "Enter and drive a vehicle", check: (s) => s.hasDriven, reward: 2500 },
  { id: "home", title: "Find Shelter", desc: "Rent any property", check: (s) => !!s.homeId, reward: 3000 }
];

function mat(scene, name, color, emissive = null) {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.FromHexString(color);
  if (emissive) m.emissiveColor = Color3.FromHexString(emissive);
  return m;
}

function aabb(ax, az, aw, ad, bx, bz, bw, bd) {
  return Math.abs(ax - bx) < (aw + bw) * 0.5 && Math.abs(az - bz) < (ad + bd) * 0.5;
}

function buildWorld(scene, appearance) {
  const M = {
    grass: mat(scene, "g", "#35483d"), road: mat(scene, "r", "#20262a"),
    pavement: mat(scene, "p", "#8b8d87"), line: mat(scene, "l", "#e6d6a6"),
    zebra: mat(scene, "z", "#d8d6cc"), glass: mat(scene, "gl", "#3f6671"),
    concrete: mat(scene, "c", "#b6aa95"), cream: mat(scene, "cr", "#d2c4a8"),
    dark: mat(scene, "d", "#59615e"), roof: mat(scene, "rf", "#353d3d"),
    palm: mat(scene, "pt", "#5a4533"), leaf: mat(scene, "lf", "#315b42"),
    lamp: mat(scene, "lp", "#e9c878", "#d6a74c"),
    carRed: mat(scene, "cr2", "#a64b3f"), carBlue: mat(scene, "cb", "#416f8b"),
    carBlack: mat(scene, "ck", "#262b31"), white: mat(scene, "w", "#d6d8d4"),
    skin: mat(scene, "sk", appearance.skin), shirt: mat(scene, "sh", appearance.shirt),
    trousers: mat(scene, "tr", appearance.trousers),
    planter: mat(scene, "pl", "#4a5c48"), soil: mat(scene, "so", "#3d3228"),
    bench: mat(scene, "be", "#6b5344"), marker: mat(scene, "mk", "#e7c77f", "#c9a45a"),
    npc: mat(scene, "np", "#6b5344")
  };
  const colliders = [];

  const ground = MeshBuilder.CreateGround("gnd", { width: 320, height: 320 }, scene);
  ground.position.y = -0.08; ground.material = M.grass;

  const avenue = MeshBuilder.CreateBox("ave", { width: 18, height: 0.12, depth: 280 }, scene);
  avenue.position.y = 0; avenue.material = M.road;
  for (let z = -130; z <= 130; z += 10) {
    const d = MeshBuilder.CreateBox("dash", { width: 0.22, height: 0.025, depth: 4.5 }, scene);
    d.position.set(0, 0.075, z); d.material = M.line;
  }
  [-8.5, 8.5].forEach((x) => {
    const e = MeshBuilder.CreateBox("edge", { width: 0.12, height: 0.02, depth: 278 }, scene);
    e.position.set(x, 0.07, 0); e.material = M.line;
  });
  [-11.5, 11.5].forEach((x) => {
    const w = MeshBuilder.CreateBox("walk", { width: 3.5, height: 0.25, depth: 280 }, scene);
    w.position.set(x, 0.05, 0); w.material = M.pavement;
  });

  [-100, -70, -40, -15, 15, 40, 70, 100].forEach((z) => {
    const side = MeshBuilder.CreateBox("cross", { width: 220, height: 0.11, depth: 10 }, scene);
    side.position.set(0, -0.005, z); side.material = M.road;
    for (let i = -4; i <= 4; i++) {
      const s = MeshBuilder.CreateBox("zb", { width: 1.2, height: 0.03, depth: 0.55 }, scene);
      s.position.set(i * 1.5, 0.08, z); s.material = M.zebra;
    }
  });

  for (let z = -125; z <= 125; z += 18) {
    [-14, 14].forEach((x) => {
      const pole = MeshBuilder.CreateCylinder("pole", { height: 5.4, diameter: 0.12 }, scene);
      pole.position.set(x, 2.7, z); pole.material = M.dark;
      const bulb = MeshBuilder.CreateSphere("bulb", { diameter: 0.28 }, scene);
      bulb.position.set(x + (x < 0 ? 0.85 : -0.85), 5.1, z); bulb.material = M.lamp;
    });
  }

  for (let z = -120; z <= 120; z += 24) {
    [-12.8, 12.8].forEach((x) => {
      const box = MeshBuilder.CreateBox("plb", { width: 1.4, height: 0.55, depth: 1.4 }, scene);
      box.position.set(x, 0.35, z); box.material = M.planter;
      const bush = MeshBuilder.CreateSphere("bush", { diameter: 0.9 }, scene);
      bush.position.set(x, 1.05, z); bush.material = M.leaf; bush.scaling.y = 0.7;
    });
  }

  const lots = [
    [-28,-90,14,20,12,"cream"],[-45,-85,15,24,14,"glass"],[-28,-60,13,18,11,"concrete"],
    [-46,-55,16,22,13,"cream"],[-29,-30,12,26,14,"glass"],[-47,-25,15,19,12,"concrete"],
    [-28,-5,13,21,11,"cream"],[-46,5,14,28,15,"glass"],[-29,30,12,17,10,"concrete"],
    [-47,40,15,23,13,"cream"],[-28,65,13,20,12,"glass"],[-46,80,16,25,14,"concrete"],
    [28,-95,14,22,13,"cream"],[46,-88,15,26,15,"glass"],[29,-62,13,18,11,"concrete"],
    [47,-50,16,24,14,"cream"],[28,-28,12,20,12,"glass"],[46,-15,15,22,13,"concrete"],
    [29,10,13,27,15,"cream"],[47,25,14,19,11,"glass"],[28,50,12,21,12,"concrete"],
    [46,70,15,24,14,"cream"],[29,95,13,18,11,"glass"],
    [-70,-70,18,16,12,"concrete"],[-72,-30,20,18,14,"cream"],[-70,20,18,22,13,"glass"],
    [70,-75,18,19,13,"cream"],[72,-25,20,21,14,"glass"],[70,30,18,16,11,"concrete"],
    [-40,120,16,18,12,"glass"],[40,120,16,20,13,"cream"],[-40,-120,15,17,11,"concrete"],[40,-120,15,19,12,"glass"]
  ];
  lots.forEach((lot, idx) => {
    const [x, z, w, h, d, kind] = lot;
    const mtl = kind === "glass" ? M.glass : kind === "cream" ? M.cream : M.concrete;
    const b = MeshBuilder.CreateBox("b" + idx, { width: w, height: h, depth: d }, scene);
    b.position.set(x, h / 2, z); b.material = mtl;
    const roof = MeshBuilder.CreateBox("br" + idx, { width: w + 0.35, height: 0.45, depth: d + 0.35 }, scene);
    roof.position.set(x, h + 0.2, z); roof.material = M.roof;
    colliders.push({ x, z, hw: w / 2 + 0.4, hd: d / 2 + 0.4 });
  });

  for (let z = -120; z <= 120; z += 22) {
    [-18, 18].forEach((x) => {
      const trunk = MeshBuilder.CreateCylinder("palm", { height: 4.6, diameterTop: 0.25, diameterBottom: 0.42 }, scene);
      trunk.position.set(x, 2.3, z); trunk.material = M.palm;
      for (let a = 0; a < 6; a++) {
        const f = MeshBuilder.CreateBox("fr", { width: 0.28, height: 0.12, depth: 3.6 }, scene);
        f.position.set(x, 4.45, z); f.rotation.y = (a * Math.PI) / 3; f.rotation.x = -0.18; f.material = M.leaf;
      }
      colliders.push({ x, z, hw: 0.55, hd: 0.55 });
    });
  }

  // Parked cars (non-driveable scenery)
  const carMats = [M.carRed, M.carBlue, M.carBlack, M.white];
  for (let i = 0; i < 10; i++) {
    const z = -100 + i * 20;
    const x = i % 2 === 0 ? -6.2 : 6.2;
    const body = MeshBuilder.CreateBox("pc" + i, { width: 2.1, height: 0.85, depth: 4.2 }, scene);
    body.position.set(x, 0.65, z); body.material = carMats[i % 4];
    const cabin = MeshBuilder.CreateBox("pcc" + i, { width: 1.55, height: 0.65, depth: 1.9 }, scene);
    cabin.position.set(x, 1.28, z - 0.15); cabin.material = M.glass;
    colliders.push({ x, z, hw: 1.2, hd: 2.3 });
  }

  // Player vehicle (driveable)
  const vBody = MeshBuilder.CreateBox("player-car", { width: 2.2, height: 0.9, depth: 4.4 }, scene);
  vBody.position.set(5.5, 0.7, 12); vBody.material = M.carBlue;
  const vCabin = MeshBuilder.CreateBox("player-car-cabin", { width: 1.6, height: 0.7, depth: 2 }, scene);
  vCabin.parent = vBody; vCabin.position.set(0, 0.7, -0.2); vCabin.material = M.glass;
  const vehicle = { body: vBody, cabin: vCabin, occupied: false };

  // Traffic
  const traffic = [];
  for (let i = 0; i < 4; i++) {
    const body = MeshBuilder.CreateBox("tc" + i, { width: 2.1, height: 0.85, depth: 4.2 }, scene);
    body.position.set(3.8, 0.65, -90 + i * 50); body.material = carMats[(i + 1) % 4];
    const cabin = MeshBuilder.CreateBox("tcc" + i, { width: 1.55, height: 0.65, depth: 1.9 }, scene);
    cabin.position.set(3.8, 1.28, -90 + i * 50 - 0.15); cabin.material = M.glass;
    traffic.push({ body, cabin, z: body.position.z, speed: 5 + i * 0.6 });
  }

  // Job / property markers (glowing pillars)
  const markers = [];
  JOBS.forEach((j) => {
    const m = MeshBuilder.CreateCylinder("job-" + j.id, { height: 2.2, diameter: 0.5 }, scene);
    m.position.set(j.x, 1.1, j.z); m.material = M.marker;
    markers.push({ mesh: m, type: "job", id: j.id, x: j.x, z: j.z });
  });
  PROPERTIES.forEach((p) => {
    const m = MeshBuilder.CreateBox("prop-" + p.id, { width: 0.6, height: 2.2, depth: 0.6 }, scene);
    m.position.set(p.x, 1.1, p.z); m.material = M.lamp;
    markers.push({ mesh: m, type: "property", id: p.id, x: p.x, z: p.z });
  });

  // Simple NPC pedestrians
  const npcs = [];
  for (let i = 0; i < 6; i++) {
    const root = MeshBuilder.CreateCapsule("npc" + i, { height: 2.0, radius: 0.35 }, scene);
    root.position.set((i % 2 === 0 ? -10 : 10), 1.0, -40 + i * 25);
    root.material = M.npc;
    npcs.push({
      mesh: root,
      z: root.position.z,
      x: root.position.x,
      speed: 1.5 + (i % 3) * 0.4,
      dir: i % 2 === 0 ? 1 : -1
    });
  }

  // Player avatar
  const player = MeshBuilder.CreateCapsule("player", { height: 2.4, radius: 0.42 }, scene);
  player.position.set(-3.2, 1.2, 8); player.visibility = 0; player.isPickable = false;

  const head = MeshBuilder.CreateSphere("head", { diameter: 0.68 }, scene);
  head.parent = player; head.position.set(0, 0.78, 0); head.material = M.skin;
  const torso = MeshBuilder.CreateBox("torso", { width: 0.8, height: 0.8, depth: 0.42 }, scene);
  torso.parent = player; torso.position.set(0, -0.1, 0); torso.material = M.shirt;
  const legL = MeshBuilder.CreateBox("legL", { width: 0.25, height: 0.65, depth: 0.28 }, scene);
  legL.parent = player; legL.position.set(-0.2, -0.83, 0); legL.material = M.trousers;
  const legR = MeshBuilder.CreateBox("legR", { width: 0.25, height: 0.65, depth: 0.28 }, scene);
  legR.parent = player; legR.position.set(0.2, -0.83, 0); legR.material = M.trousers;
  const armL = MeshBuilder.CreateBox("armL", { width: 0.18, height: 0.55, depth: 0.18 }, scene);
  armL.parent = player; armL.position.set(-0.55, -0.05, 0); armL.material = M.skin;
  const armR = MeshBuilder.CreateBox("armR", { width: 0.18, height: 0.55, depth: 0.18 }, scene);
  armR.parent = player; armR.position.set(0.55, -0.05, 0); armR.material = M.skin;
  player.rotationQuaternion = Quaternion.Identity();

  scene.clearColor = new Color4(0.48, 0.64, 0.7, 1);
  const hemi = new HemisphericLight("h", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.85; hemi.groundColor = new Color3(0.25, 0.23, 0.19);
  const sun = new DirectionalLight("s", new Vector3(-0.5, -1, 0.25), scene);
  sun.position = new Vector3(40, 60, -40); sun.intensity = 1.25;

  const camera = new FollowCamera("cam", new Vector3(0, 6, -12), scene);
  camera.lockedTarget = player;
  camera.radius = 10; camera.heightOffset = 3.4; camera.rotationOffset = 180;
  camera.cameraAcceleration = 0.07; camera.maxCameraSpeed = 18;
  camera.lowerRadiusLimit = 6; camera.upperRadiusLimit = 24;
  camera.attachControl(true);

  return {
    player, camera, traffic, colliders, vehicle, markers, npcs,
    parts: { head, torso, legL, legR, armL, armR }
  };
}

export default function Home() {
  const [phase, setPhase] = useState("intro");
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [help, setHelp] = useState(true);
  const [coords, setCoords] = useState({ x: -3, z: 8 });
  const [paused, setPaused] = useState(false);
  const [locationName, setLocationName] = useState("LEKKI AVENUE");
  const [charName, setCharName] = useState("Player");
  const [skinId, setSkinId] = useState("warm");
  const [shirtId, setShirtId] = useState("gold");
  const [trouserId, setTrouserId] = useState("navy");

  // Economy & progression
  const [cash, setCash] = useState(25000);
  const [jobsDone, setJobsDone] = useState(0);
  const [hasDriven, setHasDriven] = useState(false);
  const [homeId, setHomeId] = useState(null);
  const [missionDone, setMissionDone] = useState({});
  const [panel, setPanel] = useState(null); // jobs | properties | wallet | missions | null
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
  const velocityRef = useRef({ x: 0, z: 0 });
  const walkPhaseRef = useRef(0);
  const statsRef = useRef({ x: -3, z: 8, jobsDone: 0, hasDriven: false, homeId: null });

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { drivingRef.current = driving; }, [driving]);
  useEffect(() => {
    statsRef.current = { x: coords.x, z: coords.z, jobsDone, hasDriven, homeId };
  }, [coords, jobsDone, hasDriven, homeId]);

  useEffect(() => {
    if (phase !== "intro") return;
    const t = setTimeout(() => setPhase("login"), 2200);
    return () => clearTimeout(t);
  }, [phase]);

  // Mission checker
  useEffect(() => {
    if (phase !== "world") return;
    const s = statsRef.current;
    MISSIONS.forEach((m) => {
      if (!missionDone[m.id] && m.check(s)) {
        setMissionDone((prev) => ({ ...prev, [m.id]: true }));
        setCash((c) => c + m.reward);
        setToast(`Mission complete: ${m.title} (+₦${m.reward.toLocaleString()})`);
        setTimeout(() => setToast(null), 2500);
      }
    });
  }, [coords, jobsDone, hasDriven, homeId, phase, missionDone]);

  const appearance = {
    skin: SKIN_TONES.find((s) => s.id === skinId)?.hex || "#9b6545",
    shirt: SHIRT_COLORS.find((s) => s.id === shirtId)?.hex || "#d2a95c",
    trousers: TROUSER_COLORS.find((s) => s.id === trouserId)?.hex || "#283c4b"
  };

  const updateLocation = useCallback((x, z) => {
    if (Math.abs(x) < 10) {
      if (z > 60) setLocationName("NORTH AVENUE");
      else if (z < -60) setLocationName("SOUTH AVENUE");
      else setLocationName("LEKKI AVENUE");
    } else if (x < -10) setLocationName(z > 40 ? "NORTH-WEST" : z < -40 ? "SOUTH-WEST" : "WEST STREETS");
    else setLocationName(z > 40 ? "NORTH-EAST" : z < -40 ? "SOUTH-EAST" : "EAST STREETS");
  }, []);

  useEffect(() => {
    if (phase !== "world" || !canvasRef.current || engineRef.current) return;

    const engine = new Engine(canvasRef.current, true, { antialias: true, stencil: true });
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
        // Exit vehicle
        drivingRef.current = false;
        setDriving(false);
        v.occupied = false;
        p.visibility = 0;
        p.position.x = v.body.position.x + 2.5;
        p.position.z = v.body.position.z;
        p.position.y = 1.2;
        cameraRef.current.lockedTarget = p;
        cameraRef.current.radius = 10;
        setPrompt(null);
        return;
      }
      const dist = Math.hypot(p.position.x - v.body.position.x, p.position.z - v.body.position.z);
      if (dist < 4.5) {
        drivingRef.current = true;
        setDriving(true);
        setHasDriven(true);
        v.occupied = true;
        p.visibility = 0;
        // hide visual parts while driving
        const parts = partsRef.current;
        if (parts) Object.values(parts).forEach((m) => { m.isVisible = false; });
        cameraRef.current.lockedTarget = v.body;
        cameraRef.current.radius = 12;
        cameraRef.current.heightOffset = 4;
        setPrompt(null);
        setToast("Driving — WASD to steer, F to exit");
        setTimeout(() => setToast(null), 2500);
      }
    }

    function tryInteract() {
      if (drivingRef.current) return;
      const p = playerRef.current;
      if (!p) return;
      for (const mk of markersRef.current) {
        const dist = Math.hypot(p.position.x - mk.x, p.position.z - mk.z);
        if (dist < 4) {
          if (mk.type === "job") setPanel("jobs");
          if (mk.type === "property") setPanel("properties");
          return;
        }
      }
    }

    let last = performance.now();
    const BOUND = 145;
    const pr = 0.55;

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (!pausedRef.current) {
        const allKeys = new Set([...keys, ...mobileKeys]);
        let dx = 0, dz = 0;
        if (allKeys.has("w") || allKeys.has("arrowup")) dz += 1;
        if (allKeys.has("s") || allKeys.has("arrowdown")) dz -= 1;
        if (allKeys.has("a") || allKeys.has("arrowleft")) dx -= 1;
        if (allKeys.has("d") || allKeys.has("arrowright")) dx += 1;

        if (drivingRef.current) {
          // Vehicle driving
          const v = vehicleRef.current;
          if (v) {
            const speed = allKeys.has("run") || runningRef.current ? 28 : 16;
            if (dx || dz) {
              const len = Math.hypot(dx, dz) || 1;
              dx /= len; dz /= len;
              v.body.position.x += dx * speed * dt;
              v.body.position.z += dz * speed * dt;
              v.body.position.x = Math.max(-BOUND, Math.min(BOUND, v.body.position.x));
              v.body.position.z = Math.max(-BOUND, Math.min(BOUND, v.body.position.z));
              v.body.rotation.y = Math.atan2(dx, dz);
              setCoords({ x: Math.round(v.body.position.x), z: Math.round(v.body.position.z) });
              updateLocation(v.body.position.x, v.body.position.z);
            }
          }
        } else {
          // On foot
          const isRunning = runningRef.current || allKeys.has("run");
          const targetSpeed = isRunning ? 14 : 7.2;
          const vel = velocityRef.current;
          if (dx || dz) {
            const len = Math.hypot(dx, dz) || 1;
            dx /= len; dz /= len;
            vel.x += (dx * targetSpeed - vel.x) * Math.min(1, 12 * dt);
            vel.z += (dz * targetSpeed - vel.z) * Math.min(1, 12 * dt);
          } else {
            vel.x *= Math.max(0, 1 - 10 * dt);
            vel.z *= Math.max(0, 1 - 10 * dt);
            if (Math.hypot(vel.x, vel.z) < 0.15) { vel.x = 0; vel.z = 0; }
          }

          const speed = Math.hypot(vel.x, vel.z);
          const parts = partsRef.current;
          if (parts && speed > 0.4) {
            walkPhaseRef.current += dt * (isRunning ? 14 : 9);
            const swing = Math.sin(walkPhaseRef.current) * (isRunning ? 0.55 : 0.35);
            parts.legL.rotation.x = swing; parts.legR.rotation.x = -swing;
            parts.armL.rotation.x = -swing * 0.8; parts.armR.rotation.x = swing * 0.8;
          } else if (parts) {
            parts.legL.rotation.x *= 0.85; parts.legR.rotation.x *= 0.85;
            parts.armL.rotation.x *= 0.85; parts.armR.rotation.x *= 0.85;
          }

          if (vel.x || vel.z) {
            const p = playerRef.current;
            let fx = p.position.x + vel.x * dt;
            let fz = p.position.z + vel.z * dt;
            const cols = collidersRef.current;
            let hitX = false, hitZ = false;
            for (const c of cols) {
              if (aabb(fx, p.position.z, pr * 2, pr * 2, c.x, c.z, c.hw * 2, c.hd * 2)) hitX = true;
              if (aabb(hitX ? p.position.x : fx, fz, pr * 2, pr * 2, c.x, c.z, c.hw * 2, c.hd * 2)) hitZ = true;
            }
            if (hitX) { fx = p.position.x; vel.x = 0; }
            if (hitZ) { fz = p.position.z; vel.z = 0; }
            fx = Math.max(-BOUND, Math.min(BOUND, fx));
            fz = Math.max(-BOUND, Math.min(BOUND, fz));
            p.position.x = fx; p.position.z = fz;
            if (speed > 0.3) p.rotation.y = Math.atan2(vel.x, vel.z);
            setCoords({ x: Math.round(fx), z: Math.round(fz) });
            updateLocation(fx, fz);
          }

          // Interaction prompts
          const p = playerRef.current;
          const v = vehicleRef.current;
          let near = null;
          if (v && Math.hypot(p.position.x - v.body.position.x, p.position.z - v.body.position.z) < 4.5) {
            near = "Press F · Enter vehicle";
          } else {
            for (const mk of markersRef.current) {
              if (Math.hypot(p.position.x - mk.x, p.position.z - mk.z) < 4) {
                near = mk.type === "job" ? "Press E · Job available" : "Press E · View property";
                break;
              }
            }
          }
          setPrompt(near);
        }

        // Traffic
        trafficRef.current.forEach((car) => {
          car.z += car.speed * dt;
          if (car.z > 140) car.z = -140;
          car.body.position.z = car.z;
          car.cabin.position.z = car.z - 0.15;
        });

        // NPCs patrol
        npcsRef.current.forEach((n) => {
          n.z += n.speed * n.dir * dt;
          if (n.z > 120) n.dir = -1;
          if (n.z < -120) n.dir = 1;
          n.mesh.position.z = n.z;
          n.mesh.rotation.y = n.dir > 0 ? 0 : Math.PI;
        });
      }
      scene.render();
    };

    engine.runRenderLoop(tick);
    const resize = () => engine.resize();
    window.addEventListener("resize", resize);
    setReady(true);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("resize", resize);
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
      setToast("Not enough cash to rent");
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

  // ── UI phases ──
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
          <p className="copy">Create your character, work jobs, rent a place, drive, and build your Nigerian story.</p>
          <button onClick={() => setPhase("creator")}>CREATE CHARACTER <span>→</span></button>
          <small>Full vertical slice · v1.0.0-alpha</small>
        </section>
      </main>
    );
  }

  if (phase === "creator") {
    return (
      <main className="creator">
        <div className="creator-card">
          <h1>YOUR CHARACTER</h1>
          <p className="sub">LOOK LIKE YOURSELF IN LEKKI</p>
          <div className="creator-preview" style={{ background: `linear-gradient(180deg, ${appearance.skin} 40%, ${appearance.shirt} 40% 70%, ${appearance.trousers} 70%)` }} />
          <div className="creator-field">
            <label>DISPLAY NAME</label>
            <input type="text" maxLength={16} value={charName} onChange={(e) => setCharName(e.target.value.slice(0, 16))} />
          </div>
          <div className="creator-field">
            <label>SKIN TONE</label>
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
            <button type="button" className="primary" onClick={() => { setPhase("entering"); setTimeout(() => setPhase("world"), 1400); }}>ENTER CITY</button>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "entering") {
    return (
      <main className="transition">
        <div className="transition-ring" />
        <h1>ENTERING YOUR WORLD</h1>
        <p>Welcome, {charName || "Player"}...</p>
      </main>
    );
  }

  const missionsComplete = MISSIONS.filter((m) => missionDone[m.id]).length;

  return (
    <main className="world-screen">
      <div className="hud-top">
        <a className="wordmark" href="#" onClick={(e) => e.preventDefault()}>NAIJALIFE</a>
        <div className="hud-place">
          <span className="live-dot" /> <span className="hud-name">{charName || "Player"}</span>
          <small>{driving ? "DRIVING" : "ON FOOT"} · {locationName}</small>
        </div>
        <div className="hud-money">
          ₦{cash.toLocaleString()} <small>VIRTUAL CASH</small>
        </div>
      </div>

      <div className="game-stage">
        <canvas ref={canvasRef} className="world-canvas" aria-label="NaijaLife district" />
        {!ready && <div className="loading-world">BUILDING YOUR CITY...</div>}

        <div className="location-chip">
          <span>⌖</span> {locationName}
          <small>X {coords.x} · Z {coords.z}{homeId ? " · HOME SET" : ""}</small>
        </div>

        <div className="mission-chip">
          <small>MISSIONS {missionsComplete}/{MISSIONS.length}</small>
          <strong>{MISSIONS.find((m) => !missionDone[m.id])?.title || "All missions done"}</strong>
          <span>{MISSIONS.find((m) => !missionDone[m.id])?.desc || "Explore, work, drive, rent."}</span>
        </div>

        <div className="controls-help">
          <strong>{driving ? "DRIVE" : "MOVE"}</strong>
          <span>WASD · Shift run</span>
          <span>F vehicle · E interact</span>
          <div className="hud-actions">
            <button onClick={() => setPanel("jobs")}>JOBS</button>
            <button onClick={() => setPanel("properties")}>HOME</button>
            <button onClick={() => setPanel("missions")}>TASKS</button>
            <button onClick={() => setPanel("wallet")}>WALLET</button>
          </div>
          <button onClick={() => setHelp(!help)}>{help ? "HIDE PAD" : "PAD"}</button>
          <button onClick={() => setPaused(!paused)}>{paused ? "RESUME" : "PAUSE"}</button>
        </div>

        {help && !driving && (
          <div className="mobile-pad">
            <button onPointerDown={() => padDown("w")} onPointerUp={() => padUp("w")} onPointerLeave={() => padUp("w")}>▲</button>
            <div className="pad-row">
              <button onPointerDown={() => padDown("a")} onPointerUp={() => padUp("a")} onPointerLeave={() => padUp("a")}>◀</button>
              <button onPointerDown={() => padDown("s")} onPointerUp={() => padUp("s")} onPointerLeave={() => padUp("s")}>▼</button>
              <button onPointerDown={() => padDown("d")} onPointerUp={() => padUp("d")} onPointerLeave={() => padUp("d")}>▶</button>
            </div>
            <button className="run-btn" onPointerDown={() => { padDown("run"); runningRef.current = true; }} onPointerUp={() => { padUp("run"); runningRef.current = false; }} onPointerLeave={() => { padUp("run"); runningRef.current = false; }}>RUN</button>
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
              <p className="panel-sub">GOLD MARKERS ON THE MAP · WORK TO EARN</p>
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
              <p className="panel-sub">AMBER MARKERS · RENT A PLACE TO LIVE</p>
              <div className="panel-list">
                {PROPERTIES.map((p) => (
                  <div className="panel-item" key={p.id}>
                    <div>
                      <strong>{p.name}{homeId === p.id ? " ✓" : ""}</strong>
                      <span>{p.desc}</span>
                    </div>
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
              <p className="panel-sub">{missionsComplete} OF {MISSIONS.length} COMPLETE</p>
              <div className="panel-list">
                {MISSIONS.map((m) => (
                  <div className="panel-item" key={m.id}>
                    <div>
                      <strong>{missionDone[m.id] ? "✓ " : ""}{m.title}</strong>
                      <span>{m.desc} · ₦{m.reward.toLocaleString()}</span>
                    </div>
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
              <p className="panel-sub">VIRTUAL NAIRA · ALPHA ECONOMY</p>
              <div className="panel-list">
                <div className="panel-item"><div><strong>Balance</strong><span>Available cash</span></div><strong>₦{cash.toLocaleString()}</strong></div>
                <div className="panel-item"><div><strong>Jobs completed</strong><span>Lifetime shifts</span></div><strong>{jobsDone}</strong></div>
                <div className="panel-item"><div><strong>Home</strong><span>Current rental</span></div><strong>{homeId ? PROPERTIES.find((p) => p.id === homeId)?.name : "None"}</strong></div>
              </div>
              <button className="panel-close" onClick={() => setPanel(null)}>CLOSE</button>
            </div>
          </div>
        )}
      </div>

      <div className="bottom-bar">
        <span><i /> NAIJALIFE ALPHA</span>
        <span>v1.0.0-alpha · FULL SLICE</span>
        <span>JOBS · DRIVE · RENT · MISSIONS</span>
      </div>
    </main>
  );
}
