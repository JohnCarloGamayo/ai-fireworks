import { useState, useMemo, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  PerspectiveCamera,
  shaderMaterial,
  Float,
  Stars,
  Sparkles,
  useTexture
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { MathUtils } from 'three';
import * as random from 'maath/random';
import { GestureRecognizer, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

// --- 动态生成照片列表 (top.jpg + 1.jpg 到 30.jpg) ---
const TOTAL_NUMBERED_PHOTOS = 30;
// 修改：将 top.jpg 加入到数组开头
const bodyPhotoPaths = [
  '/photos/top.jpg',
  ...Array.from({ length: TOTAL_NUMBERED_PHOTOS }, (_, i) => `/photos/${i + 1}.jpg`)
];

// --- 视觉配置 ---
const CONFIG = {
  colors: {
    emerald: '#8B5CF6', // Modern vibrant purple
    gold: '#C084FC', // Light purple accent
    silver: '#E9D5FF', // Very light purple
    red: '#A855F7', // Purple variant
    green: '#9333EA', // Deep purple
    white: '#FFFFFF',
    warmLight: '#C084FC',
    lights: ['#8B5CF6', '#A855F7', '#C084FC', '#E879F9'], // Purple gradient
    borders: ['#F3E8FF', '#E9D5FF', '#DDD6FE', '#C4B5FD', '#A78BFA', '#8B5CF6', '#7C3AED'],
    giftColors: ['#8B5CF6', '#A855F7', '#C084FC', '#9333EA'],
    candyColors: ['#8B5CF6', '#FFFFFF']
  },
  counts: {
    foliage: 15000,
    ornaments: 300,   // 拍立得照片数量
    elements: 200,    // 圣诞元素数量
    lights: 400       // 彩灯数量
  },
  tree: { height: 22, radius: 9 }, // 树体尺寸
  circle: { radius: 12, thickness: 3 }, // Circle shape parameters
  photos: {
    // top 属性不再需要，因为已经移入 body
    body: bodyPhotoPaths
  }
};

// --- Shader Material (Foliage with Fireworks) ---
const FoliageMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color(CONFIG.colors.emerald), uProgress: 0, uFireworks: 0 },
  `uniform float uTime; uniform float uProgress; uniform float uFireworks;
  attribute vec3 aTargetPos; attribute float aRandom; attribute vec3 aExplosionDir;
  varying vec2 vUv; varying float vMix; varying float vFireworks;
  float cubicInOut(float t) { return t < 0.5 ? 4.0 * t * t * t : 0.5 * pow(2.0 * t - 2.0, 3.0) + 1.0; }
  void main() {
    vUv = uv;
    vec3 noise = vec3(sin(uTime * 1.5 + position.x), cos(uTime + position.y), sin(uTime * 1.5 + position.z)) * 0.15;
    float t = cubicInOut(uProgress);
    
    // Fireworks explosion effect
    vec3 explosionPos = aTargetPos + aExplosionDir * uFireworks * 50.0 * (1.0 + aRandom * 0.5);
    float gravity = -uFireworks * uFireworks * 10.0;
    explosionPos.y += gravity;
    
    vec3 targetPos = mix(aTargetPos + noise, explosionPos, uFireworks);
    vec3 finalPos = mix(position, targetPos, t);
    
    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_PointSize = (60.0 * (1.0 + aRandom)) / -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
    vMix = t;
    vFireworks = uFireworks;
  }`,
  `uniform vec3 uColor; varying float vMix; varying float vFireworks;
  void main() {
    float r = distance(gl_PointCoord, vec2(0.5)); if (r > 0.5) discard;
    vec3 baseColor = uColor;
    // Color shift for fireworks
    vec3 fireworksColor = mix(baseColor, vec3(1.0, 0.3, 0.1) + vec3(sin(vFireworks * 10.0), cos(vFireworks * 8.0), 0.5) * 0.5, vFireworks);
    vec3 finalColor = mix(fireworksColor * 0.3, fireworksColor * 1.5, vMix);
    float alpha = 1.0 - vFireworks * 0.7;
    gl_FragColor = vec4(finalColor, alpha);
  }`
);
extend({ FoliageMaterial });

// --- Helper: Circle Shape ---
const getCirclePosition = () => {
  const radius = CONFIG.circle.radius;
  const thickness = CONFIG.circle.thickness;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI * 2;
  const r = radius + (Math.random() - 0.5) * thickness;
  return [
    r * Math.cos(theta) * Math.sin(phi),
    r * Math.sin(theta) * Math.sin(phi),
    r * Math.cos(phi)
  ];
};

// --- Component: Foliage ---
const Foliage = ({ state }: { state: 'CHAOS' | 'FORMED' }) => {
  const materialRef = useRef<any>(null);
  const fireworksStartTimeRef = useRef<number | null>(null);
  
  const { positions, targetPositions, randoms, explosionDirs } = useMemo(() => {
    const count = CONFIG.counts.foliage;
    const positions = new Float32Array(count * 3);
    const targetPositions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);
    const explosionDirs = new Float32Array(count * 3);
    const spherePoints = random.inSphere(new Float32Array(count * 3), { radius: 25 }) as Float32Array;
    
    for (let i = 0; i < count; i++) {
      positions[i*3] = spherePoints[i*3];
      positions[i*3+1] = spherePoints[i*3+1];
      positions[i*3+2] = spherePoints[i*3+2];
      
      const [tx, ty, tz] = getCirclePosition();
      targetPositions[i*3] = tx;
      targetPositions[i*3+1] = ty;
      targetPositions[i*3+2] = tz;
      
      // Random explosion direction
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      explosionDirs[i*3] = Math.sin(phi) * Math.cos(theta);
      explosionDirs[i*3+1] = Math.sin(phi) * Math.sin(theta);
      explosionDirs[i*3+2] = Math.cos(phi);
      
      randoms[i] = Math.random();
    }
    return { positions, targetPositions, randoms, explosionDirs };
  }, []);
  
  useFrame((rootState, delta) => {
    if (materialRef.current) {
      materialRef.current.uTime = rootState.clock.elapsedTime;
      const targetProgress = state === 'FORMED' ? 1 : 0;
      materialRef.current.uProgress = MathUtils.damp(materialRef.current.uProgress, targetProgress, 1.5, delta);
      
      // Fireworks effect when dispersing
      if (state === 'CHAOS' && materialRef.current.uProgress > 0.5) {
        if (fireworksStartTimeRef.current === null) {
          fireworksStartTimeRef.current = rootState.clock.elapsedTime;
        }
        const timeSinceStart = rootState.clock.elapsedTime - fireworksStartTimeRef.current;
        materialRef.current.uFireworks = Math.min(timeSinceStart * 0.8, 1.0);
      } else {
        fireworksStartTimeRef.current = null;
        materialRef.current.uFireworks = MathUtils.damp(materialRef.current.uFireworks || 0, 0, 2, delta);
      }
    }
  });
  
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aTargetPos" args={[targetPositions, 3]} />
        <bufferAttribute attach="attributes-aRandom" args={[randoms, 1]} />
        <bufferAttribute attach="attributes-aExplosionDir" args={[explosionDirs, 3]} />
      </bufferGeometry>
      {/* @ts-ignore */}
      <foliageMaterial ref={materialRef} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};

// --- Component: Photo Ornaments (Double-Sided Polaroid) ---
const PhotoOrnaments = ({ state, onPhotoClick }: { state: 'CHAOS' | 'FORMED', onPhotoClick?: (photoPath: string) => void }) => {
  const textures = useTexture(CONFIG.photos.body);
  const count = CONFIG.counts.ornaments;
  const groupRef = useRef<THREE.Group>(null);

  const borderGeometry = useMemo(() => new THREE.PlaneGeometry(1.2, 1.5), []);
  const photoGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  const data = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => {
      const chaosPos = new THREE.Vector3((Math.random()-0.5)*70, (Math.random()-0.5)*70, (Math.random()-0.5)*70);
      const [tx, ty, tz] = getCirclePosition();
      const targetPos = new THREE.Vector3(tx, ty, tz);

      const isBig = Math.random() < 0.2;
      const baseScale = isBig ? 2.2 : 0.8 + Math.random() * 0.6;
      const weight = 0.8 + Math.random() * 1.2;
      const borderColor = CONFIG.colors.borders[Math.floor(Math.random() * CONFIG.colors.borders.length)];

      const rotationSpeed = {
        x: (Math.random() - 0.5) * 1.0,
        y: (Math.random() - 0.5) * 1.0,
        z: (Math.random() - 0.5) * 1.0
      };
      const chaosRotation = new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);

      return {
        chaosPos, targetPos, scale: baseScale, weight,
        textureIndex: i % textures.length,
        borderColor,
        currentPos: chaosPos.clone(),
        chaosRotation,
        rotationSpeed,
        wobbleOffset: Math.random() * 10,
        wobbleSpeed: 0.5 + Math.random() * 0.5
      };
    });
  }, [textures, count]);

  useFrame((stateObj, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    const time = stateObj.clock.elapsedTime;

    groupRef.current.children.forEach((group, i) => {
      const objData = data[i];
      const target = isFormed ? objData.targetPos : objData.chaosPos;

      objData.currentPos.lerp(target, delta * (isFormed ? 0.8 * objData.weight : 0.5));
      group.position.copy(objData.currentPos);

      if (isFormed) {
         const targetLookPos = new THREE.Vector3(group.position.x * 2, group.position.y + 0.5, group.position.z * 2);
         group.lookAt(targetLookPos);

         const wobbleX = Math.sin(time * objData.wobbleSpeed + objData.wobbleOffset) * 0.05;
         const wobbleZ = Math.cos(time * objData.wobbleSpeed * 0.8 + objData.wobbleOffset) * 0.05;
         group.rotation.x += wobbleX;
         group.rotation.z += wobbleZ;

      } else {
         group.rotation.x += delta * objData.rotationSpeed.x;
         group.rotation.y += delta * objData.rotationSpeed.y;
         group.rotation.z += delta * objData.rotationSpeed.z;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => (
        <group key={i} scale={[obj.scale, obj.scale, obj.scale]} rotation={state === 'CHAOS' ? obj.chaosRotation : [0,0,0]}>
          {/* 正面 */}
          <group position={[0, 0, 0.015]}>
            <mesh 
              geometry={photoGeometry}
              onClick={(e) => {
                if (state === 'CHAOS' && onPhotoClick) {
                  e.stopPropagation();
                  onPhotoClick(CONFIG.photos.body[obj.textureIndex]);
                }
              }}
              onPointerOver={() => state === 'CHAOS' && (document.body.style.cursor = 'pointer')}
              onPointerOut={() => (document.body.style.cursor = 'default')}
            >
              <meshStandardMaterial
                map={textures[obj.textureIndex]}
                roughness={0.5} metalness={0}
                emissive={CONFIG.colors.white} emissiveMap={textures[obj.textureIndex]} emissiveIntensity={1.0}
                side={THREE.FrontSide}
              />
            </mesh>
            <mesh geometry={borderGeometry} position={[0, -0.15, -0.01]}>
              <meshStandardMaterial color={obj.borderColor} roughness={0.9} metalness={0} side={THREE.FrontSide} />
            </mesh>
          </group>
          {/* 背面 */}
          <group position={[0, 0, -0.015]} rotation={[0, Math.PI, 0]}>
            <mesh 
              geometry={photoGeometry}
              onClick={(e) => {
                if (state === 'CHAOS' && onPhotoClick) {
                  e.stopPropagation();
                  onPhotoClick(CONFIG.photos.body[obj.textureIndex]);
                }
              }}
              onPointerOver={() => state === 'CHAOS' && (document.body.style.cursor = 'pointer')}
              onPointerOut={() => (document.body.style.cursor = 'default')}
            >
              <meshStandardMaterial
                map={textures[obj.textureIndex]}
                roughness={0.5} metalness={0}
                emissive={CONFIG.colors.white} emissiveMap={textures[obj.textureIndex]} emissiveIntensity={1.0}
                side={THREE.FrontSide}
              />
            </mesh>
            <mesh geometry={borderGeometry} position={[0, -0.15, -0.01]}>
              <meshStandardMaterial color={obj.borderColor} roughness={0.9} metalness={0} side={THREE.FrontSide} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
};

// --- Component: Christmas Elements ---
const ChristmasElements = ({ state }: { state: 'CHAOS' | 'FORMED' }) => {
  const count = CONFIG.counts.elements;
  const groupRef = useRef<THREE.Group>(null);

  const boxGeometry = useMemo(() => new THREE.BoxGeometry(0.8, 0.8, 0.8), []);
  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(0.5, 16, 16), []);
  const caneGeometry = useMemo(() => new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8), []);

  const data = useMemo(() => {
    return new Array(count).fill(0).map(() => {
      const chaosPos = new THREE.Vector3((Math.random()-0.5)*60, (Math.random()-0.5)*60, (Math.random()-0.5)*60);
      const [tx, ty, tz] = getCirclePosition();
      const targetPos = new THREE.Vector3(tx, ty, tz);

      const type = Math.floor(Math.random() * 3);
      let color; let scale = 1;
      if (type === 0) { color = CONFIG.colors.giftColors[Math.floor(Math.random() * CONFIG.colors.giftColors.length)]; scale = 0.8 + Math.random() * 0.4; }
      else if (type === 1) { color = CONFIG.colors.giftColors[Math.floor(Math.random() * CONFIG.colors.giftColors.length)]; scale = 0.6 + Math.random() * 0.4; }
      else { color = Math.random() > 0.5 ? CONFIG.colors.red : CONFIG.colors.white; scale = 0.7 + Math.random() * 0.3; }

      const rotationSpeed = { x: (Math.random()-0.5)*2.0, y: (Math.random()-0.5)*2.0, z: (Math.random()-0.5)*2.0 };
      return { type, chaosPos, targetPos, color, scale, currentPos: chaosPos.clone(), chaosRotation: new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI), rotationSpeed };
    });
  }, [boxGeometry, sphereGeometry, caneGeometry]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const objData = data[i];
      const target = isFormed ? objData.targetPos : objData.chaosPos;
      objData.currentPos.lerp(target, delta * 1.5);
      mesh.position.copy(objData.currentPos);
      mesh.rotation.x += delta * objData.rotationSpeed.x; mesh.rotation.y += delta * objData.rotationSpeed.y; mesh.rotation.z += delta * objData.rotationSpeed.z;
    });
  });

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => {
        let geometry; if (obj.type === 0) geometry = boxGeometry; else if (obj.type === 1) geometry = sphereGeometry; else geometry = caneGeometry;
        return ( <mesh key={i} scale={[obj.scale, obj.scale, obj.scale]} geometry={geometry} rotation={obj.chaosRotation}>
          <meshStandardMaterial color={obj.color} roughness={0.3} metalness={0.4} emissive={obj.color} emissiveIntensity={0.2} />
        </mesh> )})}
    </group>
  );
};

// --- Component: Fairy Lights ---
const FairyLights = ({ state }: { state: 'CHAOS' | 'FORMED' }) => {
  const count = CONFIG.counts.lights;
  const groupRef = useRef<THREE.Group>(null);
  const geometry = useMemo(() => new THREE.SphereGeometry(0.8, 8, 8), []);

  const data = useMemo(() => {
    return new Array(count).fill(0).map(() => {
      const chaosPos = new THREE.Vector3((Math.random()-0.5)*60, (Math.random()-0.5)*60, (Math.random()-0.5)*60);
      const [tx, ty, tz] = getCirclePosition();
      const targetPos = new THREE.Vector3(tx, ty, tz);
      const color = CONFIG.colors.lights[Math.floor(Math.random() * CONFIG.colors.lights.length)];
      const speed = 2 + Math.random() * 3;
      return { chaosPos, targetPos, color, speed, currentPos: chaosPos.clone(), timeOffset: Math.random() * 100 };
    });
  }, []);

  useFrame((stateObj, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    const time = stateObj.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const objData = data[i];
      const target = isFormed ? objData.targetPos : objData.chaosPos;
      objData.currentPos.lerp(target, delta * 2.0);
      const mesh = child as THREE.Mesh;
      mesh.position.copy(objData.currentPos);
      const intensity = (Math.sin(time * objData.speed + objData.timeOffset) + 1) / 2;
      if (mesh.material) { (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = isFormed ? 3 + intensity * 4 : 0; }
    });
  });

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => ( <mesh key={i} scale={[0.15, 0.15, 0.15]} geometry={geometry}>
          <meshStandardMaterial color={obj.color} emissive={obj.color} emissiveIntensity={0} toneMapped={false} />
        </mesh> ))}
    </group>
  );
};

// --- Component: Center Star (Gold 3D Star in Center of Circle) ---
const CenterStar = ({ state }: { state: 'CHAOS' | 'FORMED' }) => {
  const groupRef = useRef<THREE.Group>(null);

  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const outerRadius = 1.3; const innerRadius = 0.7; const points = 5;
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      i === 0 ? shape.moveTo(radius*Math.cos(angle), radius*Math.sin(angle)) : shape.lineTo(radius*Math.cos(angle), radius*Math.sin(angle));
    }
    shape.closePath();
    return shape;
  }, []);

  const starGeometry = useMemo(() => {
    return new THREE.ExtrudeGeometry(starShape, {
      depth: 0.4,
      bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 3,
    });
  }, [starShape]);

  const goldMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: CONFIG.colors.gold,
    emissive: CONFIG.colors.gold,
    emissiveIntensity: 1.5,
    roughness: 0.1,
    metalness: 1.0,
  }), []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
      const targetScale = state === 'FORMED' ? 1 : 0;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 3);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
        <mesh geometry={starGeometry} material={goldMaterial} />
      </Float>
    </group>
  );
};

// --- Main Scene Experience ---
const Experience = ({ sceneState, rotationSpeed, onPhotoClick }: { sceneState: 'CHAOS' | 'FORMED', rotationSpeed: number, onPhotoClick?: (photoPath: string) => void }) => {
  const controlsRef = useRef<any>(null);
  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.setAzimuthalAngle(controlsRef.current.getAzimuthalAngle() + rotationSpeed);
      controlsRef.current.update();
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 8, 60]} fov={45} />
      <OrbitControls ref={controlsRef} enablePan={false} enableZoom={true} minDistance={30} maxDistance={120} autoRotate={rotationSpeed === 0 && sceneState === 'FORMED'} autoRotateSpeed={0.3} maxPolarAngle={Math.PI / 1.7} />

      <color attach="background" args={['#0A0514']} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Environment preset="night" background={false} />

      <ambientLight intensity={0.4} color="#1E0B3D" />
      <pointLight position={[30, 30, 30]} intensity={100} color={CONFIG.colors.warmLight} />
      <pointLight position={[-30, 10, -30]} intensity={50} color={CONFIG.colors.gold} />
      <pointLight position={[0, -20, 10]} intensity={30} color="#A78BFA" />

      <group position={[0, -6, 0]}>
        <Foliage state={sceneState} />
        <Suspense fallback={null}>
           <PhotoOrnaments state={sceneState} onPhotoClick={onPhotoClick} />
           <ChristmasElements state={sceneState} />
           <FairyLights state={sceneState} />
           <CenterStar state={sceneState} />
        </Suspense>
        <Sparkles count={600} scale={50} size={8} speed={0.4} opacity={0.4} color={CONFIG.colors.silver} />
      </group>

      <EffectComposer>
        <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.1} intensity={1.5} radius={0.5} mipmapBlur />
        <Vignette eskil={false} offset={0.1} darkness={1.2} />
      </EffectComposer>
    </>
  );
};

// --- Gesture Controller ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GestureController = ({ onGesture, onMove, onStatus, debugMode }: any) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let gestureRecognizer: GestureRecognizer;
    let requestRef: number;

    const setup = async () => {
      onStatus("DOWNLOADING AI...");
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
        gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        onStatus("REQUESTING CAMERA...");
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            onStatus("AI READY: SHOW HAND");
            predictWebcam();
          }
        } else {
            onStatus("ERROR: CAMERA PERMISSION DENIED");
        }
      } catch (err: any) {
        onStatus(`ERROR: ${err.message || 'MODEL FAILED'}`);
      }
    };

    const predictWebcam = () => {
      if (gestureRecognizer && videoRef.current && canvasRef.current) {
        if (videoRef.current.videoWidth > 0) {
            const results = gestureRecognizer.recognizeForVideo(videoRef.current, Date.now());
            const ctx = canvasRef.current.getContext("2d");
            if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                canvasRef.current.width = videoRef.current.videoWidth; canvasRef.current.height = videoRef.current.videoHeight;
                if (results.landmarks) for (const landmarks of results.landmarks) {
                        const drawingUtils = new DrawingUtils(ctx);
                        drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, { color: "#FF0000", lineWidth: 2 });
                        drawingUtils.drawLandmarks(landmarks, { color: "#FF3333", lineWidth: 1 });
                }
            }

            if (results.gestures.length > 0) {
              const name = results.gestures[0][0].categoryName; const score = results.gestures[0][0].score;
              if (score > 0.4) {
                 if (name === "Open_Palm") onGesture("CHAOS"); if (name === "Closed_Fist") onGesture("FORMED");
                 if (debugMode) onStatus(`DETECTED: ${name}`);
              }
              if (results.landmarks.length > 0) {
                const speed = (0.5 - results.landmarks[0][0].x) * 0.3;
                onMove(Math.abs(speed) > 0.005 ? speed : 0);
              }
            } else { onMove(0); if (debugMode) onStatus("AI READY: NO HAND"); }
        }
        requestRef = requestAnimationFrame(predictWebcam);
      }
    };
    setup();
    return () => cancelAnimationFrame(requestRef);
  }, [onGesture, onMove, onStatus, debugMode]);

  return (
    <>
      <video 
        ref={videoRef} 
        style={{ 
          position: 'fixed', 
          top: '20px', 
          left: '20px', 
          width: '240px', 
          height: '180px',
          zIndex: 100, 
          pointerEvents: 'none', 
          transform: 'scaleX(-1)',
          borderRadius: '12px',
          border: '2px solid rgba(139, 92, 246, 0.6)',
          boxShadow: '0 8px 20px rgba(139, 92, 246, 0.3)',
          objectFit: 'cover'
        }} 
        playsInline 
        muted 
        autoPlay 
      />
      <canvas 
        ref={canvasRef} 
        style={{ 
          position: 'fixed', 
          top: '20px', 
          left: '20px', 
          width: '240px', 
          height: '180px', 
          zIndex: 101, 
          pointerEvents: 'none', 
          transform: 'scaleX(-1)',
          borderRadius: '12px'
        }} 
      />
    </>
  );
};

// --- App Entry ---
export default function App() {
  const [sceneState, setSceneState] = useState<'CHAOS' | 'FORMED'>('CHAOS');
  const [rotationSpeed, setRotationSpeed] = useState(0);
  const [aiStatus, setAiStatus] = useState("INITIALIZING...");
  const [debugMode, setDebugMode] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const handlePhotoClick = (photoPath: string) => {
    setSelectedPhoto(photoPath);
  };

  const closeModal = () => {
    setSelectedPhoto(null);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000', position: 'relative', overflow: 'hidden' }}>
      <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
        <Canvas dpr={[1, 2]} gl={{ toneMapping: THREE.ReinhardToneMapping }} shadows>
            <Experience sceneState={sceneState} rotationSpeed={rotationSpeed} onPhotoClick={handlePhotoClick} />
        </Canvas>
      </div>
      <GestureController onGesture={setSceneState} onMove={setRotationSpeed} onStatus={setAiStatus} debugMode={debugMode} />

      {/* UI - Stats */}
      <div style={{ position: 'absolute', bottom: '30px', left: '40px', color: '#A78BFA', zIndex: 10, fontFamily: 'sans-serif', userSelect: 'none' }}>
        <div style={{ marginBottom: '15px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>Memories</p>
          <p style={{ fontSize: '24px', color: '#C084FC', fontWeight: 'bold', margin: 0 }}>
            {CONFIG.counts.ornaments.toLocaleString()} <span style={{ fontSize: '10px', color: '#4C1D95', fontWeight: 'normal' }}>POLAROIDS</span>
          </p>
        </div>
        <div>
          <p style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>Foliage</p>
          <p style={{ fontSize: '24px', color: '#8B5CF6', fontWeight: 'bold', margin: 0 }}>
            {(CONFIG.counts.foliage / 1000).toFixed(0)}K <span style={{ fontSize: '10px', color: '#4C1D95', fontWeight: 'normal' }}>PARTICLES</span>
          </p>
        </div>
      </div>

      {/* UI - Buttons */}
      <div style={{ position: 'absolute', bottom: '30px', right: '40px', zIndex: 10, display: 'flex', gap: '10px' }}>
        <button onClick={() => setDebugMode(!debugMode)} style={{ padding: '12px 15px', backgroundColor: debugMode ? '#8B5CF6' : 'rgba(10,5,20,0.8)', border: '2px solid #8B5CF6', color: debugMode ? '#FFFFFF' : '#C084FC', fontFamily: 'sans-serif', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', backdropFilter: 'blur(10px)', borderRadius: '8px', transition: 'all 0.3s ease' }}>
           {debugMode ? 'HIDE DEBUG' : '🛠 DEBUG'}
        </button>
        <button onClick={() => setSceneState(s => s === 'CHAOS' ? 'FORMED' : 'CHAOS')} style={{ padding: '12px 30px', backgroundColor: 'rgba(10,5,20,0.8)', border: '2px solid #8B5CF6', color: '#C084FC', fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', backdropFilter: 'blur(10px)', borderRadius: '8px', transition: 'all 0.3s ease' }}>
           {sceneState === 'CHAOS' ? 'Form Circle' : 'Fireworks'}
        </button>
      </div>

      {/* UI - AI Status */}
      <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', color: aiStatus.includes('ERROR') ? '#F87171' : '#A78BFA', fontSize: '10px', letterSpacing: '2px', zIndex: 10, background: 'rgba(10,5,20,0.8)', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(139, 92, 246, 0.3)', backdropFilter: 'blur(10px)' }}>
        {aiStatus}
      </div>

      {/* Modal for Photo Display */}
      {selectedPhoto && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            backgroundColor: 'rgba(10, 5, 20, 0.95)', 
            zIndex: 1000, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)'
          }}
          onClick={closeModal}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img 
              src={selectedPhoto} 
              alt="Selected memory" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '90vh', 
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 0 60px rgba(139, 92, 246, 0.5), 0 0 100px rgba(192, 132, 252, 0.3)'
              }} 
            />
            <button
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#8B5CF6',
                border: '2px solid #C084FC',
                color: '#FFFFFF',
                fontSize: '28px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.6)',
                transition: 'all 0.3s ease'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}