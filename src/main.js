import * as THREE from 'three';

// ==========================
// 상수 정의 (Constants)
// ==========================
const TIME_CONSTANTS = {
  TRANSITION_HOUR: 3600000, // 1시간 (전환 시간)
  LONG_TRANSITION: 5400000, // 1.5시간 (저녁 전환 시간)
};

// 💖 MZ 감성 색상 팔레트: 네온, 파스텔, 몽환적인 톤
const COLOR_PALETTE = {
  night: {
    sun: new THREE.Color('#4a004a'),
    skyTop: new THREE.Color('#0a001a'),
    skyBottom: new THREE.Color('#220044'),
    light: 0.1,
    fog: 0.1,
    skyline: new THREE.Color('#100025'),
    emissive: new THREE.Color('#66ffcc') 
  },
  dawn: {
    sun: new THREE.Color('#ff5757'),
    skyTop: new THREE.Color('#6a5ac0'),
    skyBottom: new THREE.Color('#f0e0f0'),
    light: 0.3,
    fog: 0.25,
    skyline: new THREE.Color('#331166'),
    emissive: new THREE.Color('#ffb6c1')
  },
  morning: {
    sun: new THREE.Color('#a8e4a8'),
    skyTop: new THREE.Color('#87ceeb'),
    skyBottom: new THREE.Color('#e0ffff'),
    light: 0.7,
    fog: 0.4,
    skyline: new THREE.Color('#507788'),
    emissive: new THREE.Color(0x000000)
  },
  noon: {
    sun: new THREE.Color('#ffffff'),
    skyTop: new THREE.Color('#b0e0e6'),
    skyBottom: new THREE.Color('#f0f8ff'),
    light: 1.0,
    fog: 0.5,
    skyline: new THREE.Color('#77aadd'),
    emissive: new THREE.Color(0x000000)
  },
  afternoon: {
    sun: new THREE.Color('#ffcc99'),
    skyTop: new THREE.Color('#b0e0e6'),
    skyBottom: new THREE.Color('#f0f8ff'),
    light: 0.8,
    fog: 0.45,
    skyline: new THREE.Color('#77aadd'),
    emissive: new THREE.Color(0x000000)
  },
  dusk: {
    sun: new THREE.Color('#ff8c00'),
    skyTop: new THREE.Color('#9400d3'),
    skyBottom: new THREE.Color('#ffb6c1'),
    light: 0.4,
    fog: 0.3,
    skyline: new THREE.Color('#662288'),
    emissive: new THREE.Color('#ff55cc')
  }
};

// ==========================
// 전역 상태 변수
// ==========================
let simulatedTime = null;
let isTimelapsePlaying = false; 
let timelapseSpeed = 60; // 1초당 60분씩 진행 (1분 = 24시간)
let lastRealTimeUpdateMinute = -1; // 실시간 업데이트 추적 변수

// ==========================
// 기본 세팅
// ==========================
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(COLOR_PALETTE.night.skyTop.getHex(), 0.008); 

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 4, 5); 
camera.lookAt(0, 10, -20); 

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; 
renderer.toneMappingExposure = 0.5;
document.body.style.margin = '0';
document.body.appendChild(renderer.domElement);

// ==========================
// 텍스처 로더
// ==========================
const loader = new THREE.TextureLoader();

// ==========================
// 태양 (Sun)
// ==========================
const sunGeo = new THREE.SphereGeometry(2.5, 64, 64);
const sunMat = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
});
const sun = new THREE.Mesh(sunGeo, sunMat);
sun.position.set(0, -100, -35); // 초기 태양 위치 숨김
scene.add(sun);

// 태양 글로우 효과
const glowGeo = new THREE.SphereGeometry(3.5, 32, 32);
const glowMat = new THREE.ShaderMaterial({
  transparent: true,
  side: THREE.BackSide,
  uniforms: {
    glowColor: { value: new THREE.Color(0xffaa00) },
    intensity: { value: 1.0 }
  },
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 glowColor;
    uniform float intensity;
    varying vec3 vNormal;
    void main() {
      float glow = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 3.0); 
      glow = smoothstep(0.0, 1.0, glow);
      gl_FragColor = vec4(glowColor, glow * intensity * 0.8);
    }
  `,
  blending: THREE.AdditiveBlending
});
const sunGlow = new THREE.Mesh(glowGeo, glowMat);
sun.add(sunGlow);

// ==========================
// 라이트
// ==========================
const sunLight = new THREE.PointLight(0xffffff, 2, 200);
scene.add(sunLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.05); 
scene.add(ambientLight);

// ==========================
// 하늘 그라데이션
// ==========================
const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    topColor: { value: new THREE.Color(COLOR_PALETTE.night.skyTop.getHex()) },
    bottomColor: { value: new THREE.Color(COLOR_PALETTE.night.skyBottom.getHex()) },
    offset: { value: 0 },
    exponent: { value: 0.6 }
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;
    varying vec3 vWorldPosition;
    void main() {
      float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
      gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
    }
  `,
  side: THREE.BackSide
});

const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), skyMat);
scene.add(sky);

// ==========================
// NYC 스카이라인 (이미지)
// ==========================
const skylineTexture = loader.load('/NYC_Skyline_Silhouette.png');
const skylineGeo = new THREE.PlaneGeometry(150, 50);

const skylineMat = new THREE.MeshPhongMaterial({
  map: skylineTexture,
  transparent: true,
  opacity: 0.9,
  side: THREE.DoubleSide,
  color: COLOR_PALETTE.night.skyline,
  emissive: new THREE.Color(0x000000),
  emissiveIntensity: 1
});

const skyline = new THREE.Mesh(skylineGeo, skylineMat);
skyline.position.set(0, 5, -40);
scene.add(skyline);

// ==========================
// 별 (트윙클 효과)
// ==========================
const starGeo = new THREE.BufferGeometry();
const starCount = 4000;
const starPos = new Float32Array(starCount * 3);
const starSizes = new Float32Array(starCount);

for (let i = 0; i < starCount; i++) {
  const r = 100 + Math.random() * 80;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  
  starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) + 10;
  starPos[i * 3 + 2] = r * Math.cos(phi) - 50;
  
  starSizes[i] = Math.random() * 0.7 + 0.2;
}

starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

const starMat = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    baseOpacity: { value: 0.0 }
  },
  vertexShader: `
    attribute float size;
    varying float vSize;
    void main() {
      vSize = size;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (350.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float baseOpacity;
    varying float vSize;
    void main() {
      vec2 center = gl_PointCoord - vec2(0.5);
      float dist = length(center);
      if (dist > 0.5) discard; 
      
      float circle = 1.0 - smoothstep(0.4, 0.5, dist);
      float twinkle = sin(time * 5.0 + vSize * 200.0) * 0.2 + 0.8; 
      float alpha = circle * baseOpacity * twinkle;
      
      gl_FragColor = vec4(0.95, 1.0, 1.0, alpha); 
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

// ==========================
// 위치 데이터 (뉴욕 고정)
// ==========================
const currentLocation = {
  name: 'New York City',
  lat: 40.7128,
  lng: -74.0060,
  timezone: 'America/New_York'
};

// ==========================
// Sunrise / Sunset API
// ==========================
let sunrise = null;
let sunset = null;
// let simulatedTime = null; (전역 변수로 유지)

function parseTimeString(str) {
  const [time, part] = str.split(" ");
  let [h, m, s] = time.split(":").map(Number);
  
  if (part === "PM" && h !== 12) h += 12;
  if (part === "AM" && h === 12) h = 0;
  
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  return new Date(`${year}-${month}-${day}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s || 0).padStart(2, "0")}`);
}

async function fetchSunTimes(lat, lng) {
  try {
    const res = await fetch(
      `https://api.sunrisesunset.io/json?lat=${lat}&lng=${lng}`
    );
    const data = await res.json();
    
    sunrise = parseTimeString(data.results.sunrise);
    sunset = parseTimeString(data.results.sunset);
    
    const sunriseEl = document.getElementById('sunriseTime');
    const sunsetEl = document.getElementById('sunsetTime');
    
    if (sunriseEl) {
      sunriseEl.textContent = sunrise.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      });
    }
    
    if (sunsetEl) {
      sunsetEl.textContent = sunset.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      });
    }
    
    updateSceneByTime();
  } catch (e) {
    console.error("Sun API error", e);
  }
}
fetchSunTimes(currentLocation.lat, currentLocation.lng);

// ==========================
// 시간 기반 업데이트 (Lerp 함수)
// ==========================
function lerpColors(color1, color2, mix) {
    const smoothMix = THREE.MathUtils.smoothstep(mix, 0, 1);
    return color1.clone().lerp(color2, smoothMix);
}

function lerpValues(val1, val2, mix) {
    const smoothMix = THREE.MathUtils.smoothstep(mix, 0, 1);
    return THREE.MathUtils.lerp(val1, val2, smoothMix);
}

function updateSceneByTime() {
  if (!sunrise || !sunset) return;
  
  // 🚨 실시간 모드에서는 new Date(), 가상 모드에서는 simulatedTime 사용
  const now = simulatedTime || new Date(); 
  const t = now.getTime();
  const sT = sunrise.getTime();
  const eT = sunset.getTime();
  
  const { TRANSITION_HOUR, LONG_TRANSITION } = TIME_CONSTANTS;
  const colors = COLOR_PALETTE;
  
  let period1, period2, mix, currentPeriod;
  
  if (t < sT - TRANSITION_HOUR) {
    period1 = colors.night;
    period2 = colors.night;
    mix = 0;
    currentPeriod = 'Deep into the Night 🌌'; 
  } else if (t < sT) {
    period1 = colors.night;
    period2 = colors.dawn;
    mix = (t - (sT - TRANSITION_HOUR)) / TRANSITION_HOUR;
    currentPeriod = 'The Softest Blue Hour 💜'; 
  } else if (t < sT + TRANSITION_HOUR) {
    period1 = colors.dawn;
    period2 = colors.morning;
    mix = (t - sT) / TRANSITION_HOUR;
    currentPeriod = 'New Beginning Light ✨'; 
  } else if (t < sT + 2 * TRANSITION_HOUR) {
    period1 = colors.morning;
    period2 = colors.noon;
    mix = (t - (sT + TRANSITION_HOUR)) / TRANSITION_HOUR;
    currentPeriod = 'Late Morning Shine 🌤️'; 
  } else if (t < eT - LONG_TRANSITION) {
    period1 = colors.noon;
    period2 = colors.afternoon;
    mix = (t - (sT + 2 * TRANSITION_HOUR)) / (eT - LONG_TRANSITION - (sT + 2 * TRANSITION_HOUR));
    currentPeriod = 'Afternoon Daze 🍹'; 
  } else if (t < eT) {
    period1 = colors.afternoon;
    period2 = colors.dusk;
    mix = (t - (eT - LONG_TRANSITION)) / LONG_TRANSITION;
    currentPeriod = 'Golden Hour Glow 🧡'; 
  } else if (t < eT + TRANSITION_HOUR) {
    period1 = colors.dusk;
    period2 = colors.night;
    mix = (t - eT) / TRANSITION_HOUR;
    currentPeriod = 'Twilight Vibes 🔮'; 
  } else {
    period1 = colors.night;
    period2 = colors.night;
    mix = 0;
    currentPeriod = 'Deep into the Night 🌙'; 
  }
  
  mix = THREE.MathUtils.clamp(mix, 0, 1);
  
  const sunColor = lerpColors(period1.sun, period2.sun, mix);
  const skyTopColor = lerpColors(period1.skyTop, period2.skyTop, mix);
  const skyBottomColor = lerpColors(period1.skyBottom, period2.skyBottom, mix);
  const lightIntensity = lerpValues(period1.light, period2.light, mix);
  const skylineColor = lerpColors(period1.skyline, period2.skyline, mix);
  const emissiveColor = lerpColors(period1.emissive, period2.emissive, mix);

  sunMat.color.copy(sunColor);
  glowMat.uniforms.glowColor.value.copy(sunColor);
  glowMat.uniforms.intensity.value = Math.max(lightIntensity * 1.5, 0.4);
  
  const dayProgress = (t - sT) / (eT - sT);
  const clampedProgress = THREE.MathUtils.clamp(dayProgress, -0.2, 1.2);
  const angle = (clampedProgress - 0.5) * Math.PI * 1.1;
  
  sun.position.set(
    Math.sin(angle) * 60,
    Math.cos(angle) * 60 + 5, 
    -35 
  );
  
  sunLight.position.copy(sun.position);
  sunLight.color.copy(sunColor);
  sunLight.intensity = lightIntensity * 4;
  ambientLight.intensity = lightIntensity * 0.1;
  
  skyMat.uniforms.topColor.value.copy(skyTopColor);
  skyMat.uniforms.bottomColor.value.copy(skyBottomColor);
  
  const isNight = clampedProgress < 0 || clampedProgress > 1;
  starMat.uniforms.baseOpacity.value = isNight ? 1.0 : 0.0;
  
  const fogDensity = lerpValues(period1.fog, period2.fog, mix);
  scene.fog.color.copy(skyBottomColor.clone().multiplyScalar(0.7));
  scene.fog.density = fogDensity * 0.05; 

  skylineMat.opacity = 0.9 - (lightIntensity * 0.2);
  skylineMat.color.copy(skylineColor);
  skylineMat.emissive.copy(emissiveColor);
  skylineMat.emissiveIntensity = Math.pow(1.0 - lightIntensity, 2); 
  
  const periodLabel = document.getElementById('periodLabel');
  if (periodLabel) {
    periodLabel.textContent = currentPeriod;
  }
}

// ==========================
// 애니메이션
// ==========================
let time = 0;
let lastRenderTime = 0;
let lastUpdateTime = 0;
const TIME_UPDATE_INTERVAL = 1000;

function animate(currentTime) {
  requestAnimationFrame(animate);
  
  const deltaTime = (currentTime - lastRenderTime) / 1000;
  lastRenderTime = currentTime;
  
  time += deltaTime;
  starMat.uniforms.time.value = time;
  
  // 🚨 1. 타임랩스 모드 로직 (FPS 기반 업데이트)
  if (isTimelapsePlaying && sunrise && sunset) {
    const now = simulatedTime || new Date();
    const newTime = new Date(now.getTime() + timelapseSpeed * 60000 * deltaTime);
    
    // 24시간이 지나면 다시 처음부터
    if (newTime.getDate() !== now.getDate()) {
      newTime.setHours(0, 0, 0, 0);
    }
    
    simulatedTime = newTime;
    
    // UI 업데이트 (타임랩스 중 실시간 업데이트)
    if (slider) {
      slider.value = newTime.getHours() * 60 + newTime.getMinutes();
      updateTimeLabel();
    }
    
    updateSceneByTime(); // 매 프레임 업데이트
  } 
  // 🚨 2. 실시간 모드 업데이트 (1초마다 실행하여 1분 단위 변화 감지)
  else if (simulatedTime === null) {
      if (currentTime - lastUpdateTime >= 1000) { // 1초마다 업데이트 확인
        const now = new Date();
        const currentMinute = now.getMinutes();
        
        if (currentMinute !== lastRealTimeUpdateMinute) {
          updateSceneByTime();
          
          if (slider) {
              slider.value = now.getHours() * 60 + currentMinute;
              updateTimeLabel();
          }
          lastRealTimeUpdateMinute = currentMinute;
        }
        lastUpdateTime = currentTime;
      }
  } 
  // 🚨 3. 슬라이더 고정 모드
  else {
      // 슬라이더 조작 시 이미 업데이트됨.
  }
  
  // 기타 애니메이션
  sun.rotation.y += 0.001 * deltaTime * 60;
  stars.rotation.y += 0.00008 * deltaTime * 60;
  
  renderer.render(scene, camera);
}

animate(0);

// ==========================
// UI 숨기기/보이기 로직
// ==========================
function toggleUI() {
    const uiContainer = document.getElementById('ui-container');
    const toggleBtn = document.getElementById('uiToggleBtn');
    
    if (!uiContainer || !toggleBtn) return;

    const isVisible = uiContainer.style.visibility === 'visible' || uiContainer.style.opacity == 1;

    if (isVisible) {
        uiContainer.style.visibility = 'hidden';
        uiContainer.style.opacity = 0;
        toggleBtn.textContent = '⚙️';
    } else {
        uiContainer.style.visibility = 'visible';
        uiContainer.style.opacity = 1;
        toggleBtn.textContent = '❌';
    }
}

window.addEventListener('load', () => {
    const toggleBtn = document.getElementById('uiToggleBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleUI);
    }
});

// ==========================
// UI 컨트롤
// ==========================
const slider = document.getElementById('timeSlider');
const timeLabel = document.getElementById('timeLabel');
const nowBtn = document.getElementById('nowBtn');
const dateEl = document.getElementById('date');

if (dateEl) {
  dateEl.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
}

function updateTimeLabel() {
  if (!slider || !timeLabel) return;
  
  const mins = parseInt(slider.value);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  
  timeLabel.textContent = `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

if (slider) {
  slider.addEventListener('input', () => {
    isTimelapsePlaying = false;
    const playBtn = document.getElementById('playBtn');
    if (playBtn) playBtn.textContent = '▶️ Play';

    const mins = parseInt(slider.value);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    
    const d = new Date();
    d.setHours(h);
    d.setMinutes(m);
    
    simulatedTime = d;
    updateTimeLabel();
    updateSceneByTime(); 
  });
  
  const now = new Date();
  slider.value = now.getHours() * 60 + now.getMinutes();
  updateTimeLabel();
}

if (nowBtn) {
  nowBtn.addEventListener('click', () => {
    simulatedTime = null;
    isTimelapsePlaying = false; 
    const playBtn = document.getElementById('playBtn');
    if (playBtn) playBtn.textContent = '▶️ Play';
    
    const now = new Date();
    if (slider) {
      slider.value = now.getHours() * 60 + now.getMinutes();
      updateTimeLabel();
    }
    updateSceneByTime(); 
  });
}

// 🎬 타임랩스 재생/일시정지 버튼
const playBtn = document.getElementById('playBtn');
if (playBtn) {
  playBtn.addEventListener('click', () => {
    isTimelapsePlaying = !isTimelapsePlaying;
    
    if (isTimelapsePlaying) {
      playBtn.textContent = '⏸️ Pause';
      if (!simulatedTime) {
        const mins = slider ? parseInt(slider.value) : 0;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        const d = new Date();
        d.setHours(h);
        d.setMinutes(m);
        simulatedTime = d;
      }
    } else {
      playBtn.textContent = '▶️ Play';
    }
  });
}

// 🎬 타임랩스 속도 조절
const speedSlider = document.getElementById('speedSlider');
const speedLabel = document.getElementById('speedLabel');
if (speedSlider && speedLabel) {
  speedSlider.addEventListener('input', () => {
    timelapseSpeed = parseInt(speedSlider.value);
    speedLabel.textContent = `${timelapseSpeed}x`;
  });
}

// ==========================
// 반응형
// ==========================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});