const menuScreen = document.getElementById('menu-screen');
const launchBtn = document.getElementById('launch-engine-btn');
const hudOverlay = document.getElementById('hud-overlay');
const counterEl = document.getElementById('counter');
const promptEl = document.getElementById('interaction-prompt');
const crosshairEl = document.getElementById('crosshair');
const canvasHolder = document.getElementById('canvas-holder');
let scene, camera, renderer, clock;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let direction = new THREE.Vector3();
let isEngineActive = false;
let switchesCount = 0;
let interactiveObjects = [];
let escapeDoor;
const player = { yaw: 0, pitch: 0, speed: 0.14, height: 2 };
launchBtn.addEventListener('click', () => {
    menuScreen.style.display = 'none';
    hudOverlay.style.display = 'block';
    crosshairEl.style.display = 'block';
    document.body.requestPointerLock();
    if (!isEngineActive) { initGameEngine(); }
});
document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== document.body) {
        menuScreen.style.display = 'flex';
        hudOverlay.style.display = 'none';
        crosshairEl.style.display = 'none';
    }
});
document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement !== document.body) return;
    player.yaw -= event.movementX * 0.0025;
    player.pitch -= event.movementY * 0.0025;
    player.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, player.pitch));
    camera.rotation.set(0, 0, 0);
    camera.rotateY(player.yaw);
    camera.rotateX(player.pitch);
});
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') moveForward = true;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') moveBackward = true;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveLeft = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') moveRight = true;
    if (e.code === 'KeyE') processSwitchActivation();
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') moveForward = false;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') moveBackward = false;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveLeft = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') moveRight = false;
});
function initGameEngine() {
    isEngineActive = true;
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x3a2222);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, player.height, 22);
    camera.rotation.order = 'YXZ';
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    canvasHolder.appendChild(renderer.domElement);
    generateWorldMap();
    executeRenderLoop();
}
function generateWorldMap() {
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x1e331e });
    const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x4a2323 });
    const doorMaterial = new THREE.MeshBasicMaterial({ color: 0x991111 });
    const pillarMaterial = new THREE.MeshBasicMaterial({ color: 0x2d2d35 });
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMesh = new THREE.Mesh(floorGeo, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    scene.add(floorMesh);
    const buildWallSegment = (w, h, d, x, y, z) => {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, wallMaterial);
        mesh.position.set(x, y, z);
        scene.add(mesh);
    };
    buildWallSegment(60, 8, 1, 0, 4, -30);
    buildWallSegment(60, 8, 1, 0, 4, 30);
    buildWallSegment(1, 8, 60, -30, 4, 0);
    buildWallSegment(1, 8, 60, 30, 4, 0);
    const pillarGeo = new THREE.BoxGeometry(4, 8, 4);
    const positionsArray = [{x: -12, z: -8}, {x: 12, z: -8}, {x: -12, z: 12}, {x: 12, z: 12}];
    positionsArray.forEach(pos => {
        const pillarMesh = new THREE.Mesh(pillarGeo, pillarMaterial);
        pillarMesh.position.set(pos.x, 4, pos.z);
        scene.add(pillarMesh);
    });
    for (let i = 0; i < 6; i++) {
        const frameGeo = new THREE.BoxGeometry(3, 4, 0.2);
        const internalCanvas = document.createElement('canvas');
        internalCanvas.width = 64; 
        internalCanvas.height = 64;
        const canvasCtx = internalCanvas.getContext('2d');
        canvasCtx.fillStyle = '#3a0000'; 
        canvasCtx.fillRect(0, 0, 64, 64);
        canvasCtx.fillStyle = '#cc0000'; 
        canvasCtx.fillRect(16 + i, 12, 32, 40);
        const generatedTexture = new THREE.CanvasTexture(internalCanvas);
        const frameMaterial = new THREE.MeshBasicMaterial({ map: generatedTexture });
        const frameMesh = new THREE.Mesh(frameGeo, frameMaterial);
        frameMesh.position.set(-29.4, 4, -18 + (i * 7.5));
        frameMesh.rotation.y = Math.PI / 2;
        scene.add(frameMesh);
    }
    const doorGeo = new THREE.BoxGeometry(6, 6, 0.8);
    escapeDoor = new THREE.Mesh(doorGeo, doorMaterial);
    escapeDoor.position.set(0, 3, -29.3);
    scene.add(escapeDoor);
    const pointsArray = [
        { x: -14, z: -14 }, { x: 16, z: -18 },
        { x: -20, z: 10 }, { x: 18, z: 16 }, { x: 0, z: 6 }
    ];
    const postGeo = new THREE.BoxGeometry(0.8, 2, 0.8);
    const coreIndicatorGeo = new THREE.SphereGeometry(0.3, 8, 8);
    pointsArray.forEach((pos, idx) => {
        const objGroup = new THREE.Group();
        objGroup.position.set(pos.x, 1, pos.z);
        const stemMesh = new THREE.Mesh(postGeo, new THREE.MeshBasicMaterial({ color: 0x181818 }));
        const bulbMesh = new THREE.Mesh(coreIndicatorGeo, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        bulbMesh.position.set(0, 1.2, 0);
        bulbMesh.name = "indicatorLight";
        objGroup.add(stemMesh);
        objGroup.add(bulbMesh);
        objGroup.userData = { id: idx, isPulled: false };
        scene.add(objGroup);
        interactiveObjects.push(objGroup);
    });
}
function processSwitchActivation() {
    interactiveObjects.forEach((obj) => {
        let dist = camera.position.distanceTo(obj.position);
        if (dist < 4.5 && !obj.userData.isPulled) {
            obj.userData.isPulled = true;
            const bulb = obj.getObjectByName("indicatorLight");
            if (bulb) bulb.material.color.setHex(0x00ff00);
            switchesCount++;
            counterEl.innerText = switchesCount;
            if (switchesCount < 5) {
                escapeDoor.position.x += 1.2;
            } else {
                escapeDoor.position.y += 10.0;
                setTimeout(() => {
                    alert("VICTORY! YOU ESCAPED THE GARDEN OF HORROR!");
                    document.exitPointerLock();
                    window.location.reload();
                }, 300);
            }
        }
    });
}
function executeRenderLoop() {
    requestAnimationFrame(executeRenderLoop);
    if (document.pointerLockElement === document.body) {
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();
        if (moveForward || moveBackward) camera.translateZ(-direction.z * player.speed);
        if (moveLeft || moveRight) camera.translateX(direction.x * player.speed);
    }
    camera.position.y = player.height;
    let isNearTarget = false;
    interactiveObjects.forEach((obj) => {
        let dist = camera.position.distanceTo(obj.position);
        if (dist < 4.5 && !obj.userData.isPulled) {
            isNearTarget = true;
        }
    });
    promptEl.style.display = isNearTarget ? 'block' : 'none';
    renderer.render(scene, camera);
}
window.addEventListener('resize', () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

