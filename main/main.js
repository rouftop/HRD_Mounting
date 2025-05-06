import * as THREE from 'three'; // Import the entire three.js library
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { add, rotate, step } from 'three/tsl';
import Stats from 'three/addons/libs/stats.module.js';
import { update } from 'three/examples/jsm/libs/tween.module.js';

const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)

// Create a scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);

let startAngle = Math.PI / 2; // your initial angle

// Create a renderer and connection in to index.html
const canvas = document.querySelector('canvas.threejs');
const renderer = new THREE.WebGLRenderer({ canvas });

// Set the size of the renderer
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
renderer.shadowMap.enabled = true;

//change the renderer background color
renderer.setClearColor("white", 1);

const enviromentMap = new RGBELoader();
enviromentMap.load('/assets/brown_photostudio_02_1k.hdr', function (texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;

    // Create PMREM Generator for blurring
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    // Generate the blurred environment texture
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;

    // Apply the blurred texture
    scene.environmentIntensity = 0.5;
    scene.environment = envMap;
    scene.background = null; // Keep the background invisible

    // Optional: Dispose of the original HDR texture to free memory
    texture.dispose();
    pmremGenerator.dispose();
});

const MainRDLoader = new GLTFLoader();
let MainRD;

MainRDLoader.load("/models/MainHRD.glb", function (gltf) {
    MainRD = gltf.scene;
    MainRD.scale.set(0.25, 0.25, 0.25);
    scene.add(MainRD);

    MainRD.traverse((o) => {
        if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
        }
    });
}, undefined, function (error) {
    console.error(error);
});

const wallMountLoader = new GLTFLoader();
let wallMount;
wallMountLoader.load("/models/WallMountHRD.glb", function (gltf) {
    wallMount = gltf.scene;
    wallMount.scale.set(0.25, 0.25, 0.25);
    scene.add(wallMount);

    wallMount.traverse((o) => {
        if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
        }
    });
}, undefined, function (error) {
    console.error(error);
});

//handle window resize
window.addEventListener('resize', () => {
    // Update camera aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    // Update renderer size
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
}
);


const textureLoader = new THREE.TextureLoader();
const screenTextures = {
  screen1: textureLoader.load("/assets/hrd-available-english.png"),
};

let currentScreen = 'screen1';
let screenMesh;
let ScreenRD;

const ScreenRDLoader = new GLTFLoader();
ScreenRDLoader.load("/models/ScreenHRD.glb", function (gltf) {
    ScreenRD = gltf.scene;
    ScreenRD.scale.set(0.25, 0.25, 0.25);
    scene.add(ScreenRD);

    ScreenRD.traverse((o) => {
        if (o.isMesh && o.name === "00-hrd1-sys-assy_asm-20190820-1019") {
          screenMesh = o;
          o.receiveShadow = true;
          
          const tex = screenTextures[currentScreen];
          
          o.material = new THREE.MeshStandardMaterial({
              map: tex,
              metalness: 1,
              roughness: 0.5,
              side: THREE.DoubleSide,
              emissive: tex,
              emissiveIntensity: 5,
              emissiveMap: tex,
          });
        }
    });
}, undefined, function (error) {
    console.error("GLTF loading error:", error);
});


// Example usage: switch to screen2 after 2 seconds
let backlightColor = 0x3ac48e // Get the backlight color from the function
const emissiveMaterial = new THREE.MeshStandardMaterial({
    color: backlightColor,
    emissive: backlightColor, 
    emissiveIntensity: 1,
    roughness: 0.4,
    metalness: 0.6
});

const screenBacklightColors = {
  screen1: 0x3ac48e,
  screen2: "yellow",
  screen3: 0xe21c34,
};

let backlightPoints = [];

function addSurfaceLights() {
  const numLights = 12;
  const edgeLength = 2.5;
  const lightDistance = 0;

  for (let i = 0; i < numLights; i++) {
      const angle = (i / numLights) * Math.PI * 2;
      const x = Math.cos(angle) * edgeLength;
      const y = Math.sin(angle) * edgeLength;
      const z = Math.sin(angle) * lightDistance;

      const pointLight = new THREE.PointLight(backlightColor, 0.3, 7);
      pointLight.position.set(x, y, z - 0.7);
      scene.add(pointLight);
      backlightPoints.push(pointLight); // Spara i array
  }
}

const BackLightRDLoader = new GLTFLoader();
let BackLightRD;
BackLightRDLoader.load("/models/BackLightHRD.glb", function (gltf) {
  BackLightRD = gltf.scene; // Store the model in our variable
  BackLightRD.scale.set(0.25, 0.25, 0.25); // Scale the model down
  scene.add(BackLightRD);
  BackLightRD.traverse((o) => {
    if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;

        // Apply the emissive material
        o.material = emissiveMaterial;
    }

    addSurfaceLights(BackLightRD);
});
}, undefined, function (error) {
  console.error(error);
});

const screwTRLoader = new GLTFLoader();
let screwTR;
screwTRLoader.load("/models/Screw.glb", function (gltf) {
    screwTR = gltf.scene;
    screwTR.scale.set(0.25, 0.25, 0.25);
    screwTR.position.set(0.9375, -5, 0);
    scene.add(screwTR);

    screwTR.traverse((o) => {
        if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
        }
    });
}
, undefined, function (error) {
    console.error(error);
}
);

const screwTLLoader = new GLTFLoader();
let screwTL;
screwTLLoader.load("/models/Screw.glb", function (gltf) {
    screwTL = gltf.scene;
    screwTL.scale.set(0.25, 0.25, 0.25);
    screwTL.position.set(-0.9375, -5, 0);
    scene.add(screwTL);

    screwTL.traverse((o) => {
        if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
        }
    });
}
, undefined, function (error) {
    console.error(error);
}
);

const screwBRLoader = new GLTFLoader();
let screwBR;
screwBRLoader.load("/models/Screw.glb", function (gltf) {
    screwBR = gltf.scene;
    screwBR.scale.set(0.25, 0.25, 0.25);
    screwBR.position.set(0.9375, -5.885, 0);
    scene.add(screwBR);
    screwBR.traverse((o) => {
        if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
        }
    });
}
, undefined, function (error) {
    console.error(error);
}
);

const screwBLLoader = new GLTFLoader();
let screwBL;
screwBLLoader.load("/models/Screw.glb", function (gltf) {
    screwBL = gltf.scene;
    screwBL.scale.set(0.25, 0.25, 0.25);
    screwBL.position.set(-0.9375, -5.885, 0);
    scene.add(screwBL);

    screwBL.traverse((o) => {
        if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
        }
    });
}
, undefined, function (error) {
    console.error(error);
}
);

const mountingSteps = ["start", "step1", "step2", "step3", "step4", "step5", "step6", "step7", "step8"];

let currentStep = 0;


const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Circle parameters
const radius = 10; // Radius of the circle path
const circleCenter = new THREE.Vector3(0, 0, 0); // Center of the circle
let angle = Math.PI / 2; // Start at the front position

// Set the target angle (full rotation)
const targetAngle = Math.PI / 2 + Math.PI * 2;

const rotationSpeed = 0.025; // Base speed of rotation
let startTime = null; // Time when rotation started

// Camera initialization
camera.position.set(
  radius * Math.cos(angle),
  0,
  radius * Math.sin(angle)
);
camera.lookAt(circleCenter);

// Easing function: Quadratic ease-in-out (balanced acceleration and deceleration)
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

let isRotating = false;
let rotationStartTime = null;
let rotationDuration = 2000; // 2 seconds for one full rotation

function startRotation() {
    if (isRotating) return; // prevent stacking rotations
    isRotating = true;
    rotationStartTime = performance.now();

}

function updateRotation() {
    if (!isRotating) return;

    const elapsedTime = performance.now() - rotationStartTime;
    let progress = elapsedTime / rotationDuration;
    progress = Math.min(progress, 1); // Clamp between 0 and 1

    // Ease in-out for smoothness
    const easedProgress = 0.5 - Math.cos(progress * Math.PI) / 2;

    const fullRotation = Math.PI / 2.5;
    const currentAngle = startAngle + fullRotation * easedProgress;

    const x = radius * Math.cos(currentAngle);
    const z = radius * Math.sin(currentAngle);
    const y = 0;

    camera.position.set(x, y, z);
    camera.lookAt(circleCenter);

    if (progress >= 1) {
        isRotating = false;
        startAngle = currentAngle % (Math.PI * 2); // reset angle nicely
    }
}

let isReverseRotating = false;
let reverseRotationStartTime = null;
let reverseRotationDuration = 2000; // 2 seconds for reverse rotation

function reverseRotation() {
    if (isReverseRotating || isRotating) return; // prevent concurrent rotations
    isReverseRotating = true;
    reverseRotationStartTime = performance.now();
}

function updateReverseRotation() {
    if (!isReverseRotating) return;

    const elapsedTime = performance.now() - reverseRotationStartTime;
    let progress = elapsedTime / reverseRotationDuration;
    progress = Math.min(progress, 1); // Clamp between 0 and 1

    // Ease in-out for smoothness
    const easedProgress = 0.5 - Math.cos(progress * Math.PI) / 2;

    const fullRotation = Math.PI / 2.5;
    // Reverse the rotation by subtracting instead of adding
    const currentAngle = startAngle - fullRotation * easedProgress;

    const x = radius * Math.cos(currentAngle);
    const z = radius * Math.sin(currentAngle);
    const y = 0;

    camera.position.set(x, y, z);
    camera.lookAt(circleCenter);

    if (progress >= 1) {
        isReverseRotating = false;
        startAngle = currentAngle % (Math.PI * 2); // reset angle nicely
    }
}

function step1() {
    startRotation();
};

let rotationStart = null;
let objectRotationDuration = 1000; // 1 second
let rotatingObjects = false;

let targetObjectRotation = Math.PI / 18;
let startRotationZ = 0;

function step2() {
    rotatingObjects = true;
    rotationStart = performance.now();
    startRotationZ = MainRD.rotation.z;
};

function updateObjectRotation() {
    if (!rotatingObjects) return;

    const elapsed = performance.now() - rotationStart;
    let progress = Math.min(elapsed / objectRotationDuration, 1);

    // Ease in-out
    const eased = 0.5 - Math.cos(progress * Math.PI) / 2;

    const newZ = startRotationZ + eased * (targetObjectRotation - startRotationZ);

    if (MainRD) MainRD.rotation.z = newZ;
    if (BackLightRD) BackLightRD.rotation.z = newZ;
    if (ScreenRD) ScreenRD.rotation.z = newZ;

    backlightPoints.forEach((light, index) => {
        const angle = (index / backlightPoints.length) * Math.PI * 2 + newZ;
        const x = Math.cos(angle) * 2.5;
        const y = Math.sin(angle) * 2.5;
        light.position.set(x, y, -0.7);
    });

    if (progress >= 1) {
        rotatingObjects = false;
    }
}

let moveStartTime = null;
let moveDuration = 1000; // 1 second in milliseconds
let moving = false;
let initialPositions = {};
let targetPosition = new THREE.Vector3(0, 0, 10);


function step3() {
    moveStartTime = performance.now();
    moving = true;

    // Save the starting positions of all objects
    initialPositions = {
        MainRD: MainRD ? MainRD.position.clone() : null,
        BackLightRD: BackLightRD ? BackLightRD.position.clone() : null,
        ScreenRD: ScreenRD ? ScreenRD.position.clone() : null,
        backlightPoints: backlightPoints.map(light => light.position.clone()),
    };
};

function updateMovement() {
    if (!moving || !moveStartTime) return;

    const elapsed = performance.now() - moveStartTime;
    let progress = Math.min(elapsed / moveDuration, 1); // Clamp 0–1
    const easedProgress = easeInOut(progress); // Use your existing easing function

    const lerpPos = (start, end) => start.clone().lerp(end, easedProgress);

    if (MainRD && initialPositions.MainRD) {
        MainRD.position.copy(lerpPos(initialPositions.MainRD, targetPosition));
    }
    if (BackLightRD && initialPositions.BackLightRD) {
        BackLightRD.position.copy(lerpPos(initialPositions.BackLightRD, targetPosition));
    }
    if (ScreenRD && initialPositions.ScreenRD) {
        ScreenRD.position.copy(lerpPos(initialPositions.ScreenRD, targetPosition));
    }

    backlightPoints.forEach((light, index) => {
        const angle = (index / backlightPoints.length) * Math.PI * 2;
        const radius = 2.5;
        const offset = new THREE.Vector3(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            -0.7
        );
        const target = targetPosition.clone().add(offset);
        light.position.copy(lerpPos(initialPositions.backlightPoints[index], target));
    });

    if (progress === 1) {
        moving = false;
    }
}

let screwMoveStartTime = null;
let screwMoving = false;
let screwMoveDuration = 1000;
let initialScrewPositions = {};
let screwFinalPositions = {
    screwTL: new THREE.Vector3(-0.9375, 1, 0.5),
    screwTR: new THREE.Vector3(0.9375, 1, 0.5),
    screwBL: new THREE.Vector3(-0.9375, -0.885, 0.5),
    screwBR: new THREE.Vector3(0.9375, -0.885, 0.5),
};

function step4() {
    screwMoveStartTime = performance.now();
    screwMoving = true;
    initialScrewPositions = {
        screwTL: screwTL ? screwTL.position.clone() : null,
        screwTR: screwTR ? screwTR.position.clone() : null,
        screwBL: screwBL ? screwBL.position.clone() : null,
        screwBR: screwBR ? screwBR.position.clone() : null,
    };
}


function updateScrewMovement() {
    if (!screwMoving || !screwMoveStartTime) return;

    const elapsed = performance.now() - screwMoveStartTime;
    let progress = Math.min(elapsed / screwMoveDuration, 1);
    const easedProgress = easeInOut(progress);

    const lerpPos = (start, end) => start.clone().lerp(end, easedProgress);

    if (screwTL && initialScrewPositions.screwTL) {
        screwTL.position.copy(lerpPos(initialScrewPositions.screwTL, screwFinalPositions.screwTL));
    }

    if (screwTR && initialScrewPositions.screwTR) {
        screwTR.position.copy(lerpPos(initialScrewPositions.screwTR, screwFinalPositions.screwTR));
    }

    if (screwBL && initialScrewPositions.screwBL) {
        screwBL.position.copy(lerpPos(initialScrewPositions.screwBL, screwFinalPositions.screwBL));
    }
    if (screwBR && initialScrewPositions.screwBR) {
        screwBR.position.copy(lerpPos(initialScrewPositions.screwBR, screwFinalPositions.screwBR));
    }

    if (progress === 1) {
        screwMoving = false;
    }
}

let screwMoveStartTime1 = null;
let screwMoveDuration1 = 1000;
let screwMoving1 = false;

let screwStartPositions = {};
let screwTargetOffsets = {
    screwTR: new THREE.Vector3(0, 0, -1.04),
    screwTL: new THREE.Vector3(0, 0, -1.04),
    screwBR: new THREE.Vector3(0, 0, -1.04),
    screwBL: new THREE.Vector3(0, 0, -1.04),
};

function step5() {
    screwMoveStartTime1 = performance.now();
    screwMoving1 = true;

    screwStartPositions = {
        screwTR: screwTR?.position.clone(),
        screwTL: screwTL?.position.clone(),
        screwBR: screwBR?.position.clone(),
        screwBL: screwBL?.position.clone(),
    };
}

function updateScrews() {
    if (!screwMoving1 || !screwMoveStartTime1 || screwMoving) return;

    const elapsed = performance.now() - screwMoveStartTime1;
    let progress = Math.min(elapsed / screwMoveDuration1, 1);
    const eased = 0.5 - Math.cos(progress * Math.PI) / 2;

    const moveScrew = (screw, startPos, offset) => {
        if (!screw || !startPos) return;
        const target = startPos.clone().add(offset);
        screw.position.copy(startPos.clone().lerp(target, eased));
    
        // Rotate screw around Z-axis while moving (e.g. 2 full turns)
        const totalRotations = 4; // change this if needed
        screw.rotation.z = eased * totalRotations * Math.PI * 2;
    };

    moveScrew(screwTR, screwStartPositions.screwTR, screwTargetOffsets.screwTR);
    moveScrew(screwTL, screwStartPositions.screwTL, screwTargetOffsets.screwTL);
    moveScrew(screwBR, screwStartPositions.screwBR, screwTargetOffsets.screwBR);
    moveScrew(screwBL, screwStartPositions.screwBL, screwTargetOffsets.screwBL);

    if (progress === 1) {
        screwMoving1 = false;
    }
}

let moveBackStartTime = null;
let moveBackDuration = 1000; // 1 second in milliseconds
let movingBack = false;
let initialBackPositions = {};
let targetBackPosition = new THREE.Vector3(0, 0, 0);

function step6() {
    moveBackStartTime = performance.now();
    movingBack = true;

    // Save the starting positions of all objects
    initialBackPositions = {
        MainRD: MainRD ? MainRD.position.clone() : null,
        BackLightRD: BackLightRD ? BackLightRD.position.clone() : null,
        ScreenRD: ScreenRD ? ScreenRD.position.clone() : null,
        backlightPoints: backlightPoints.map(light => light.position.clone()),
    };
}

function updateMovementBack() {
    if (!movingBack || !moveBackStartTime) return;

    const elapsed = performance.now() - moveBackStartTime;
    let progress = Math.min(elapsed / moveBackDuration, 1); // Clamp 0–1
    const easedProgress = easeInOut(progress); // Use your existing easing function

    const lerpPos = (start, end) => start.clone().lerp(end, easedProgress);

    if (MainRD && initialBackPositions.MainRD) {
        MainRD.position.copy(lerpPos(initialBackPositions.MainRD, targetBackPosition));
    }
    if (BackLightRD && initialBackPositions.BackLightRD) {
        BackLightRD.position.copy(lerpPos(initialBackPositions.BackLightRD, targetBackPosition));
    }
    if (ScreenRD && initialBackPositions.ScreenRD) {
        ScreenRD.position.copy(lerpPos(initialBackPositions.ScreenRD, targetBackPosition));
    }

    backlightPoints.forEach((light, index) => {
        const angle = (index / backlightPoints.length) * Math.PI * 2;
        const radius = 2.5;
        const offset = new THREE.Vector3(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            -0.7
        );
        const target = targetPosition.clone().add(offset);
        light.position.copy(lerpPos(initialBackPositions.backlightPoints[index], target));
    });

    if (progress === 1) {
        movingBack = false;
    }
}


let rotationBackStart = null;
let objectBackRotationDuration = 1000; // 1 second
let rotatingBackObjects = false;

let targetBackObjectRotation = 0;
let startBackRotationZ = 0;

function step7() {
    rotatingBackObjects = true;
    rotationBackStart = performance.now();
    startBackRotationZ = MainRD.rotation.z;
}

function updateBackObjectRotation() {
    if (!rotatingBackObjects) return;

    const elapsed = performance.now() - rotationBackStart;
    let progress = Math.min(elapsed / objectBackRotationDuration, 1);

    // Ease in-out
    const eased = 0.5 - Math.cos(progress * Math.PI) / 2;

    const newZ = startBackRotationZ + eased * (targetBackObjectRotation - startBackRotationZ);

    if (MainRD) MainRD.rotation.z = newZ;
    if (BackLightRD) BackLightRD.rotation.z = newZ;
    if (ScreenRD) ScreenRD.rotation.z = newZ;

    backlightPoints.forEach((light, index) => {
        const angle = (index / backlightPoints.length) * Math.PI * 2 + newZ;
        const x = Math.cos(angle) * 2.5;
        const y = Math.sin(angle) * 2.5;
        light.position.set(x, y, -0.7);
    });

    if (progress >= 1) {
        rotatingBackObjects = false;
    }
}

function step8() {
    reverseRotation();
}

function canTriggerStep() {
    return !isRotating && 
           !rotatingObjects && 
           !moving && 
           !screwMoving && 
           !screwMoving1 && 
           !movingBack && 
           !rotatingBackObjects;
}

function changeStep() {
    currentStep += 1;
    if (currentStep >= mountingSteps.length) {
        currentStep = 0; // Reset to the first step
    }

    if (currentStep === 0) {
        
    } else if (currentStep === 1) {
        if(camera.position.equals(new THREE.Vector3(radius * Math.cos(Math.PI / 2), 0, radius * Math.sin(Math.PI / 2)))) {
            step1();
        }
        else{
            currentStep = 0;
        }
    }
    else if (currentStep === 2) {
        step2();
    }
    else if (currentStep === 3) {
        step3();
    }
    else if (currentStep === 4) {
        step4();
    }
    else if (currentStep === 5) {
        step5();
    }
    else if (currentStep === 6) {
        step6();
    }
    else if (currentStep === 7) {
        step7();
    }
    else if (currentStep === 8) {
        step8();
        currentStep = 0; // Reset to the first step
        screwTR.position.set(0.9375, -5, 0);
        screwTL.position.set(-0.9375, -5, 0);
        screwBL.position.set(-0.9375, -5.885, 0);
        screwBR.position.set(0.9375, -5.885, 0);
    }
};



window.addEventListener('wheel', (event) => {
    if (canTriggerStep()) {
        if (event.deltaY > 0) {
            changeStep(); // Scroll down
        } else if (event.deltaY < 0) {
            changeStep(); // Scroll up
        }
    }
});

let touchStartY = 0;
let touchEndY = 0;

window.addEventListener('touchstart', (e) => {
    if (canTriggerStep()) {
        touchStartY = e.changedTouches[0].clientY;
    }
}, false);

window.addEventListener('touchend', (e) => {
    if (canTriggerStep()) {
        touchEndY = e.changedTouches[0].clientY;
        handleSwipe();
    }
}, false);

function handleSwipe() {
    if (!canTriggerStep()) return;

    const swipeDistance = touchStartY - touchEndY;

    if (swipeDistance > 50) {
        // Swiped up
        changeStep();
    } else if (swipeDistance < -50) {
        // Swiped down
        changeStep();
    }
}

const render = () => {
    updateRotation();
    updateObjectRotation();
    updateMovement();
    updateScrewMovement();
    updateScrews();
    updateMovementBack();
    updateBackObjectRotation();
    updateReverseRotation();
    requestAnimationFrame(render);
    stats.update();
    renderer.render(scene, camera);
};

render();
