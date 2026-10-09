"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Engine,
  Scene,
  Vector3,
  Color4,
  Color3,
  HemisphericLight,
  DirectionalLight,
  MeshBuilder,
  StandardMaterial,
  FollowCamera,
  Quaternion
} from "@babylonjs/core";

/* ── helpers ── */
function makeMaterial(scene, name, color, emissive = null) {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.FromHexString(color);
  if (emissive) m.emissiveColor = Color3.FromHexString(emissive);
  return m;
}

/** Simple AABB collision helpers */
function aabbOverlap(ax, az, aw, ad, bx, bz, bw, bd) {
  return (
    Math.abs(ax - bx) < (aw + bw) * 0.5 &&
    Math.abs(az - bz) < (ad + bd) * 0.5
  );
}

function buildWorld(scene) {
  const mats = {
    grass: makeMaterial(scene, "district-green", "#35483d"),
    road: makeMaterial(scene, "asphalt", "#20262a"),
    pavement: makeMaterial(scene, "pavement", "#8b8d87"),
    line: makeMaterial(scene, "road-markings", "#e6d6a6"),
    zebra: makeMaterial(scene, "zebra", "#d8d6cc"),
    glass: makeMaterial(scene, "blue-glass", "#3f6671"),
    concrete: makeMaterial(scene, "warm-concrete", "#b6aa95"),
    cream: makeMaterial(scene, "cream-building", "#d2c4a8"),
    dark: makeMaterial(scene, "dark-building", "#59615e"),
    roof: makeMaterial(scene, "roof", "#353d3d"),
    palm: makeMaterial(scene, "palm-trunk", "#5a4533"),
    leaf: makeMaterial(scene, "palm-leaf", "#315b42"),
    lamp: makeMaterial(scene, "lamp-light", "#e9c878", "#d6a74c"),
    carRed: makeMaterial(scene, "car-red", "#a64b3f"),
    carBlue: makeMaterial(scene, "car-blue", "#416f8b"),
    carBlack: makeMaterial(scene, "car-black", "#262b31"),
    white: makeMaterial(scene, "car-white", "#d6d8d4"),
    skin: makeMaterial(scene, "character-skin", "#9b6545"),
    shirt: makeMaterial(scene, "character-shirt", "#d2a95c"),
    trousers: makeMaterial(scene, "character-trousers", "#283c4b"),
    planter: makeMaterial(scene, "planter", "#4a5c48"),
    soil: makeMaterial(scene, "soil", "#3d3228"),
    sign: makeMaterial(scene, "sign-board", "#1e2a30"),
    signGold: makeMaterial(scene, "sign-gold", "#c9a45a", "#a07830"),
    bench: makeMaterial(scene, "bench", "#6b5344")
  };

  // Collision boxes collected for player checks (x, z, halfW, halfD)
  const colliders = [];

  // Ground
  const ground = MeshBuilder.CreateGround("district-ground", { width: 180, height: 180 }, scene);
  ground.position.y = -0.08;
  ground.material = mats.grass;

  // Main avenue
  const avenue = MeshBuilder.CreateBox("lekki-avenue", { width: 16, height: 0.12, depth: 150 }, scene);
  avenue.position.y = 0;
  avenue.material = mats.road;

  // Centre dashed line
  for (let z = -68; z <= 68; z += 10) {
    const dash = MeshBuilder.CreateBox("road-dash", { width: 0.22, height: 0.025, depth: 4.5 }, scene);
    dash.position.set(0, 0.075, z);
    dash.material = mats.line;
  }

  // Edge solid lines
  [-7.6, 7.6].forEach((x) => {
    const edge = MeshBuilder.CreateBox("edge-line", { width: 0.12, height: 0.02, depth: 148 }, scene);
    edge.position.set(x, 0.07, 0);
    edge.material = mats.line;
  });

  // Sidewalks
  [-10, 10].forEach((x) => {
    const walk = MeshBuilder.CreateBox("sidewalk", { width: 3, height: 0.25, depth: 150 }, scene);
    walk.position.set(x, 0.05, 0);
    walk.material = mats.pavement;
  });

  // Cross streets + zebra crosswalks
  [-44, -18, 18, 44].forEach((z) => {
    const side = MeshBuilder.CreateBox("cross-street", { width: 130, height: 0.11, depth: 9 }, scene);
    side.position.set(0, -0.005, z);
    side.material = mats.road;

    // Cross-street dashed marks
    for (let x = -55; x <= 55; x += 12) {
      const mark = MeshBuilder.CreateBox("cross-road-mark", { width: 5, height: 0.02, depth: 0.18 }, scene);
      mark.position.set(x, 0.06, z);
      mark.material = mats.line;
    }

    // Zebra crosswalks on the main avenue at each intersection
    for (let i = -3; i <= 3; i++) {
      const stripe = MeshBuilder.CreateBox("zebra", { width: 1.1, height: 0.03, depth: 0.55 }, scene);
      stripe.position.set(i * 1.5, 0.08, z);
      stripe.material = mats.zebra;
    }
  });

  // Streetlights
  for (let z = -65; z <= 65; z += 16) {
    [-12.4, 12.4].forEach((x) => {
      const pole = MeshBuilder.CreateCylinder("streetlight-pole", { height: 5.4, diameter: 0.12 }, scene);
      pole.position.set(x, 2.7, z);
      pole.material = mats.dark;
      const arm = MeshBuilder.CreateBox("streetlight-arm", { width: 1.15, height: 0.1, depth: 0.1 }, scene);
      arm.position.set(x + (x < 0 ? 0.45 : -0.45), 5.2, z);
      arm.material = mats.dark;
      const bulb = MeshBuilder.CreateSphere("streetlight-bulb", { diameter: 0.28 }, scene);
      bulb.position.set(x + (x < 0 ? 0.85 : -0.85), 5.1, z);
      bulb.material = mats.lamp;
    });
  }

  // Planters along sidewalks
  for (let z = -58; z <= 58; z += 22) {
    [-11.2, 11.2].forEach((x) => {
      const box = MeshBuilder.CreateBox("planter-box", { width: 1.4, height: 0.55, depth: 1.4 }, scene);
      box.position.set(x, 0.35, z);
      box.material = mats.planter;
      const dirt = MeshBuilder.CreateBox("planter-soil", { width: 1.1, height: 0.12, depth: 1.1 }, scene);
      dirt.position.set(x, 0.65, z);
      dirt.material = mats.soil;
      // Small bush
      const bush = MeshBuilder.CreateSphere("planter-bush", { diameter: 0.9 }, scene);
      bush.position.set(x, 1.05, z);
      bush.material = mats.leaf;
      bush.scaling.y = 0.7;
    });
  }

  // Benches
  for (let z = -50; z <= 50; z += 40) {
    [-13.5, 13.5].forEach((x) => {
      const seat = MeshBuilder.CreateBox("bench-seat", { width: 0.5, height: 0.12, depth: 1.8 }, scene);
      seat.position.set(x, 0.55, z);
      seat.material = mats.bench;
      const back = MeshBuilder.CreateBox("bench-back", { width: 0.1, height: 0.55, depth: 1.8 }, scene);
      back.position.set(x + (x < 0 ? -0.2 : 0.2), 0.8, z);
      back.material = mats.bench;
      // Legs
      [-0.7, 0.7].forEach((dz) => {
        const leg = MeshBuilder.CreateBox("bench-leg", { width: 0.1, height: 0.45, depth: 0.1 }, scene);
        leg.position.set(x, 0.25, z + dz);
        leg.material = mats.dark;
      });
    });
  }

  // District welcome sign near spawn
  const signPost = MeshBuilder.CreateCylinder("sign-post", { height: 3.2, diameter: 0.14 }, scene);
  signPost.position.set(-14, 1.6, 12);
  signPost.material = mats.dark;
  const signBoard = MeshBuilder.CreateBox("sign-board", { width: 0.12, height: 1.4, depth: 3.2 }, scene);
  signBoard.position.set(-14, 3.4, 12);
  signBoard.material = mats.sign;
  const signAccent = MeshBuilder.CreateBox("sign-accent", { width: 0.14, height: 0.18, depth: 3.0 }, scene);
  signAccent.position.set(-14, 4.0, 12);
  signAccent.material = mats.signGold;

  // Buildings (lots: x, z, w, h, d, kind)
  const lots = [
    [-25, -54, 12, 18, 10, "dark"],
    [-40, -48, 13, 22, 14, "cream"],
    [-26, -28, 11, 17, 9, "glass"],
    [-42, -20, 15, 20, 12, "concrete"],
    [-27, 1, 12, 23, 15, "glass"],
    [-43, 12, 14, 16, 10, "cream"],
    [-27, 34, 12, 18, 11, "concrete"],
    [-43, 52, 14, 26, 16, "glass"],
    [27, -55, 14, 22, 13, "cream"],
    [43, -45, 15, 28, 18, "glass"],
    [27, -27, 12, 16, 10, "concrete"],
    [43, -15, 14, 22, 14, "cream"],
    [27, 6, 12, 28, 18, "glass"],
    [43, 20, 15, 18, 12, "concrete"],
    [27, 40, 12, 19, 12, "cream"],
    [43, 54, 15, 24, 16, "glass"],
    [-63, -35, 18, 13, 8, "concrete"],
    [-65, 8, 18, 15, 10, "cream"],
    [64, -35, 18, 17, 10, "glass"],
    [64, 35, 18, 14, 9, "concrete"]
  ];

  lots.forEach((lot, idx) => {
    const [x, z, w, h, d, kind] = lot;
    const mat =
      kind === "glass"
        ? mats.glass
        : kind === "cream"
          ? mats.cream
          : kind === "concrete"
            ? mats.concrete
            : mats.dark;
    const building = MeshBuilder.CreateBox("building-" + idx, { width: w, height: h, depth: d }, scene);
    building.position.set(x, h / 2, z);
    building.material = mat;
    const roof = MeshBuilder.CreateBox("building-roof-" + idx, { width: w + 0.35, height: 0.45, depth: d + 0.35 }, scene);
    roof.position.set(x, h + 0.2, z);
    roof.material = mats.roof;

    // Window grids facing avenue
    const facingX = x < 0 ? x + w / 2 + 0.025 : x - w / 2 - 0.025;
    for (let yy = 2; yy < h - 1; yy += 3) {
      for (let zz = z - d / 2 + 1.5; zz < z + d / 2 - 0.5; zz += 2.6) {
        const win = MeshBuilder.CreateBox("window", { width: 0.08, height: 1.25, depth: 1.15 }, scene);
        win.position.set(facingX, yy, zz);
        win.material = mats.dark;
      }
    }
    // Entrance
    const door = MeshBuilder.CreateBox("entrance", { width: 0.16, height: 2.3, depth: 1.4 }, scene);
    door.position.set(facingX + (x < 0 ? 0.06 : -0.06), 1.15, z);
    door.material = mats.roof;

    // Register collision (slightly larger for comfort)
    colliders.push({ x, z, hw: w / 2 + 0.35, hd: d / 2 + 0.35 });
  });

  // Decorative palms
  for (let z = -62; z <= 62; z += 20) {
    [-16, 16].forEach((x) => {
      const trunk = MeshBuilder.CreateCylinder("palm-trunk", { height: 4.6, diameterTop: 0.25, diameterBottom: 0.42 }, scene);
      trunk.position.set(x, 2.3, z);
      trunk.material = mats.palm;
      for (let a = 0; a < 6; a++) {
        const frond = MeshBuilder.CreateBox("palm-frond", { width: 0.28, height: 0.12, depth: 3.6 }, scene);
        frond.position.set(x, 4.45, z);
        frond.rotation.y = (a * Math.PI) / 3;
        frond.rotation.x = -0.18;
        frond.material = mats.leaf;
      }
      // Small collision for palm trunks
      colliders.push({ x, z, hw: 0.5, hd: 0.5 });
    });
  }

  // Parked cars
  const carMats = [mats.carRed, mats.carBlue, mats.carBlack, mats.white];
  for (let i = 0; i < 8; i++) {
    const z = -58 + i * 16;
    const x = i % 2 === 0 ? -5.6 : 5.6;
    const body = MeshBuilder.CreateBox("city-car-" + i, { width: 2.1, height: 0.85, depth: 4.2 }, scene);
    body.position.set(x, 0.65, z);
    body.material = carMats[i % carMats.length];
    const cabin = MeshBuilder.CreateBox("car-cabin-" + i, { width: 1.55, height: 0.65, depth: 1.9 }, scene);
    cabin.position.set(x, 1.28, z - 0.15);
    cabin.material = mats.glass;
    colliders.push({ x, z, hw: 1.2, hd: 2.3 });
  }

  // Moving traffic
  const cars = [];
  for (let i = 0; i < 3; i++) {
    const body = MeshBuilder.CreateBox("traffic-car-" + i, { width: 2.1, height: 0.85, depth: 4.2 }, scene);
    body.position.set(3.4, 0.65, -45 + i * 38);
    body.material = carMats[(i + 1) % carMats.length];
    const cabin = MeshBuilder.CreateBox("traffic-cabin-" + i, { width: 1.55, height: 0.65, depth: 1.9 }, scene);
    cabin.position.set(3.4, 1.28, -45 + i * 38 - 0.15);
    cabin.material = mats.glass;
    cars.push({ body, cabin, z: body.position.z, speed: 4.2 + i * 0.8 });
  }

  // Player avatar (capsule for collision + visual parts)
  const player = MeshBuilder.CreateCapsule("player-body", { height: 2.4, radius: 0.42 }, scene);
  player.position.set(-2.7, 1.2, 5);
  player.material = mats.shirt;
  player.isPickable = false;
  player.visibility = 0; // invisible collision capsule; visual parts are children

  const head = MeshBuilder.CreateSphere("player-head", { diameter: 0.68 }, scene);
  head.parent = player;
  head.position.set(0, 0.78, 0);
  head.material = mats.skin;

  const torso = MeshBuilder.CreateBox("player-torso", { width: 0.8, height: 0.8, depth: 0.42 }, scene);
  torso.parent = player;
  torso.position.set(0, -0.1, 0);
  torso.material = mats.shirt;

  const leg1 = MeshBuilder.CreateBox("player-leg-left", { width: 0.25, height: 0.65, depth: 0.28 }, scene);
  leg1.parent = player;
  leg1.position.set(-0.2, -0.83, 0);
  leg1.material = mats.trousers;

  const leg2 = MeshBuilder.CreateBox("player-leg-right", { width: 0.25, height: 0.65, depth: 0.28 }, scene);
  leg2.parent = player;
  leg2.position.set(0.2, -0.83, 0);
  leg2.material = mats.trousers;

  player.rotationQuaternion = Quaternion.Identity();

  // Lighting
  scene.clearColor = new Color4(0.45, 0.62, 0.68, 1);
  const hemi = new HemisphericLight("ambient-sky", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.8;
  hemi.groundColor = new Color3(0.25, 0.23, 0.19);
  const sun = new DirectionalLight("late-afternoon-sun", new Vector3(-0.5, -1, 0.25), scene);
  sun.position = new Vector3(25, 50, -30);
  sun.intensity = 1.2;

  // Third-person follow camera
  const camera = new FollowCamera("third-person-camera", new Vector3(0, 5, -10), scene);
  camera.lockedTarget = player;
  camera.radius = 8.5;
  camera.heightOffset = 3.0;
  camera.rotationOffset = 180;
  camera.cameraAcceleration = 0.08;
  camera.maxCameraSpeed = 14;
  camera.lowerRadiusLimit = 5;
  camera.upperRadiusLimit = 16;
  camera.attachControl(true);

  return { player, camera, cars, colliders };
}

/* ── Main component ── */
export default function Home() {
  const [phase, setPhase] = useState("intro");
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [help, setHelp] = useState(true);
  const [coords, setCoords] = useState({ x: -3, z: 5 });
  const [paused, setPaused] = useState(false);
  const [locationName, setLocationName] = useState("LEKKI AVENUE");

  // Persistent refs so pause doesn't destroy the scene
  const engineRef = useRef(null);
  const sceneRef = useRef(null);
  const playerRef = useRef(null);
  const carsRef = useRef([]);
  const collidersRef = useRef([]);
  const keysRef = useRef(new Set());
  const mobileKeysRef = useRef(new Set());
  const runningRef = useRef(false);
  const pausedRef = useRef(false);

  // Keep pausedRef in sync
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Intro → login auto-advance
  useEffect(() => {
    if (phase !== "intro") return;
    const t = setTimeout(() => setPhase("login"), 2200);
    return () => clearTimeout(t);
  }, [phase]);

  function enterWorld() {
    setPhase("entering");
    setTimeout(() => setPhase("world"), 1400);
  }

  // Location label helper
  const updateLocation = useCallback((x, z) => {
    if (Math.abs(x) < 8) {
      setLocationName("LEKKI AVENUE");
    } else if (x < -8) {
      setLocationName("WEST SIDE STREETS");
    } else {
      setLocationName("EAST SIDE STREETS");
    }
  }, []);

  // Babylon scene setup (only when phase becomes "world")
  useEffect(() => {
    if (phase !== "world" || !canvasRef.current) return;
    if (engineRef.current) return; // already initialised

    const engine = new Engine(canvasRef.current, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      antialias: true
    });
    const scene = new Scene(engine);
    const { player, camera, cars, colliders } = buildWorld(scene);

    engineRef.current = engine;
    sceneRef.current = scene;
    playerRef.current = player;
    carsRef.current = cars;
    collidersRef.current = colliders;

    const keys = keysRef.current;
    const mobileKeys = mobileKeysRef.current;

    const down = (e) => {
      const k = e.key.toLowerCase();
      keys.add(k);
      if (k === "shift") runningRef.current = true;
      // Escape toggles pause
      if (k === "escape") {
        setPaused((p) => !p);
      }
    };
    const up = (e) => {
      const k = e.key.toLowerCase();
      keys.delete(k);
      if (k === "shift") runningRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    let last = performance.now();
    const playerRadius = 0.55;

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (!pausedRef.current) {
        let dx = 0;
        let dz = 0;
        const allKeys = new Set([...keys, ...mobileKeys]);
        if (allKeys.has("w") || allKeys.has("arrowup")) dz += 1;
        if (allKeys.has("s") || allKeys.has("arrowdown")) dz -= 1;
        if (allKeys.has("a") || allKeys.has("arrowleft")) dx -= 1;
        if (allKeys.has("d") || allKeys.has("arrowright")) dx += 1;

        const isRunning = runningRef.current || allKeys.has("run");
        const speed = isRunning ? 12 : 6.5;

        if (dx || dz) {
          const length = Math.hypot(dx, dz) || 1;
          dx /= length;
          dz /= length;

          const p = playerRef.current;
          const proposedX = p.position.x + dx * speed * dt;
          const proposedZ = p.position.z + dz * speed * dt;

          // Collision resolution with wall sliding
          let finalX = proposedX;
          let finalZ = proposedZ;
          const cols = collidersRef.current;

          // Check X movement alone
          let hitX = false;
          for (const c of cols) {
            if (aabbOverlap(proposedX, p.position.z, playerRadius * 2, playerRadius * 2, c.x, c.z, c.hw * 2, c.hd * 2)) {
              hitX = true;
              break;
            }
          }
          if (hitX) finalX = p.position.x;

          // Check Z movement alone
          let hitZ = false;
          for (const c of cols) {
            if (aabbOverlap(finalX, proposedZ, playerRadius * 2, playerRadius * 2, c.x, c.z, c.hw * 2, c.hd * 2)) {
              hitZ = true;
              break;
            }
          }
          if (hitZ) finalZ = p.position.z;

          // District bounds
          finalX = Math.max(-78, Math.min(78, finalX));
          finalZ = Math.max(-72, Math.min(72, finalZ));

          p.position.x = finalX;
          p.position.z = finalZ;
          p.rotation.y = Math.atan2(dx, dz);

          setCoords({ x: Math.round(finalX), z: Math.round(finalZ) });
          updateLocation(finalX, finalZ);
        }

        // Traffic
        carsRef.current.forEach((car) => {
          car.z += car.speed * dt;
          if (car.z > 72) car.z = -72;
          car.body.position.z = car.z;
          car.cabin.position.z = car.z - 0.15;
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
      sceneRef.current = null;
    };
  }, [phase, updateLocation]);

  // Mobile pad helpers — hold-to-move
  function padDown(key) {
    mobileKeysRef.current.add(key);
  }
  function padUp(key) {
    mobileKeysRef.current.delete(key);
  }
  function padRunDown() {
    mobileKeysRef.current.add("run");
    runningRef.current = true;
  }
  function padRunUp() {
    mobileKeysRef.current.delete("run");
    runningRef.current = false;
  }

  /* ── Phase renders ── */
  if (phase === "intro") {
    return (
      <main className="intro">
        <div className="intro-glow" />
        <div className="logo-mark">NL</div>
        <div className="brand">NAIJALIFE</div>
        <div className="tagline">YOUR LIFE. YOUR CITY. YOUR STORY.</div>
        <div className="loading">
          <span /> LOADING YOUR WORLD
        </div>
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
          <p className="copy">
            Create your character, build your life, earn your money and shape your own Nigerian story.
          </p>
          <button onClick={enterWorld}>
            ENTER NAIJALIFE <span>→</span>
          </button>
          <small>Stage 1C · Lekki District Prototype</small>
        </section>
      </main>
    );
  }

  if (phase === "entering") {
    return (
      <main className="transition">
        <div className="transition-ring" />
        <h1>ENTERING YOUR WORLD</h1>
        <p>Preparing Lekki District...</p>
      </main>
    );
  }

  // World phase
  return (
    <main className="world-screen">
      <div className="hud-top">
        <a className="wordmark" href="#" onClick={(e) => e.preventDefault()}>
          NAIJALIFE
        </a>
        <div className="hud-place">
          <span className="live-dot" /> LEKKI DISTRICT <small>ALPHA WORLD · STAGE 1C</small>
        </div>
        <div className="hud-money">
          ₦25,000 <small>VIRTUAL CASH</small>
        </div>
      </div>

      <div className="game-stage">
        <canvas ref={canvasRef} className="world-canvas" aria-label="Playable 3D NaijaLife district" />
        {!ready && <div className="loading-world">BUILDING YOUR CITY...</div>}

        <div className="location-chip">
          <span>⌖</span> {locationName}
          <small>
            X {coords.x} · Z {coords.z}
          </small>
        </div>

        <div className="mission-chip">
          <small>FIRST DAY OBJECTIVE</small>
          <strong>Explore Lekki District</strong>
          <span>Walk the avenue, check side streets, and get a feel for your new city.</span>
        </div>

        <div className="controls-help">
          <strong>MOVE</strong>
          <span>W A S D / arrows</span>
          <span>Shift = Run</span>
          <span>Esc = Pause</span>
          <button onClick={() => setHelp(!help)}>{help ? "HIDE PAD" : "SHOW PAD"}</button>
          <button onClick={() => setPaused(!paused)}>{paused ? "RESUME" : "PAUSE"}</button>
        </div>

        {help && (
          <div className="mobile-pad">
            <button
              aria-label="Move forward"
              onPointerDown={() => padDown("w")}
              onPointerUp={() => padUp("w")}
              onPointerLeave={() => padUp("w")}
              onPointerCancel={() => padUp("w")}
            >
              ▲
            </button>
            <div className="pad-row">
              <button
                aria-label="Move left"
                onPointerDown={() => padDown("a")}
                onPointerUp={() => padUp("a")}
                onPointerLeave={() => padUp("a")}
                onPointerCancel={() => padUp("a")}
              >
                ◀
              </button>
              <button
                aria-label="Move backward"
                onPointerDown={() => padDown("s")}
                onPointerUp={() => padUp("s")}
                onPointerLeave={() => padUp("s")}
                onPointerCancel={() => padUp("s")}
              >
                ▼
              </button>
              <button
                aria-label="Move right"
                onPointerDown={() => padDown("d")}
                onPointerUp={() => padUp("d")}
                onPointerLeave={() => padUp("d")}
                onPointerCancel={() => padUp("d")}
              >
                ▶
              </button>
            </div>
            <button
              className="run-btn"
              aria-label="Run"
              onPointerDown={padRunDown}
              onPointerUp={padRunUp}
              onPointerLeave={padRunUp}
              onPointerCancel={padRunUp}
            >
              RUN
            </button>
          </div>
        )}

        {paused && (
          <div className="pause-overlay">
            <div className="pause-card">
              <h2>PAUSED</h2>
              <p>LEKKI DISTRICT · STAGE 1C</p>
              <button onClick={() => setPaused(false)}>RESUME</button>
            </div>
          </div>
        )}
      </div>

      <div className="bottom-bar">
        <span>
          <i /> WORLD SIMULATION RUNNING
        </span>
        <span>ALPHA 0.3 · STAGE 1C</span>
        <span>COLLISION · RUN · PAUSE ACTIVE</span>
      </div>
    </main>
  );
}
