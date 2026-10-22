// Global State DOM Links
const counterEl = document.getElementById('counter');
const promptEl = document.getElementById('interaction-prompt');

let scene, camera, renderer, clock;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let isLocked = false;

let switchesCount = 0;
let interactiveObjects = [];
let escapeDoor;
let flashlight;

const player = {
    yaw: 0,
    pitch: 0,
    speed: 0.12,
    height: 2
};

// Automatic initialization on load state
window.onload = () => {
    initGame();
    // Request full pointer capture lock context click frame
    document.body.addEventListener('click', () => {
        if (!isLocked) document.body.requestPointerLock();
    });
};

document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === document.body;
});

// Calculate Mouse Movement vectors for view direction alterations
document.addEventListener('mousemove', (event) => {
    if (!isLocked) return;
    player.yaw -= event.movementX * 0.0025;
    player.pitch -= event.movementY * 0.0025;
    player.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, player.pitch));

    camera.rotation.set(0, 0, 0);
    camera.rotateY(player.yaw);
    camera.rotateX(player.pitch);
});

// Listeners map for system key controls
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') moveForward = true;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') moveBackward = true;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveLeft = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') moveRight = true;
    if (e.code === 'KeyE') checkInteraction();
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') moveForward = false;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') moveBackward = false;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveLeft = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') moveRight = false;
});

function initGame() {
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020202, 0.08); // Infinite creep dark depth fog space

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, player.height, 0);
    camera.rotation.order = 'YXZ';

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Deep ambient night glow values
    const ambient = new THREE.AmbientLight(0x0a0505);
    scene.add(ambient);

    // Dynamic Flashlight point lock tracking setup
    flashlight = new THREE.SpotLight(0xffffff, 1.5, 25, Math.PI / 5, 0.5, 1);
    flashlight.castShadow = true;
    scene.add(flashlight);

    buildMap();
    animate();
}

function buildMap() {
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x111611, roughness: 0.9 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1c1a1a, roughness: 0.7 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x3a1a1a, roughness: 0.5 });

    // Ground Space Mesh
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Blind Ceiling Mesh Enclosure
    const ceil = new THREE.Mesh(floorGeo, new THREE.MeshBasicMaterial({ color: 0x050505 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 8;
    scene.add(ceil);

    // Structural generation helper wrapper
    const createWall = (w, h, d, x, y, z) => {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
    };

    createWall(60, 8, 1, 0, 4, -30); // Boundaries North
    createWall(60, 8, 1, 0, 4, 30);  // Boundaries South
    createWall(1, 8, 60, -30, 4, 0); // Boundaries West
    createWall(1, 8, 60, 30, 4, 0);  // Boundaries East

    // Dynamic extraction maps for Creepy Abstract Paintings (Blood Glitch Forms)
    for (let i = 0; i < 6; i++) {
        const frameGeo = new THREE.BoxGeometry(2.5, 3.5, 0.1);
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#100'; ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#700'; ctx.fillRect(16 + i, 10, 32, 40); // Generate unpredictable bloody distortions
        const artTex = new THREE.CanvasTexture(canvas);
        const frameMat = new THREE.MeshStandardMaterial({ map: artTex });

        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(-29.4, 4, -20 + (i * 8));
        frame.rotation.y = Math.PI / 2;
        scene.add(frame);
    }

    // Interactive Gate Portal Mesh
    const doorGeo = new THREE.BoxGeometry(4, 6, 0.4);
    escapeDoor = new THREE.Mesh(doorGeo, doorMat);
    escapeDoor.position.set(0, 3, -29.4);
    scene.add(escapeDoor);

    // Distribution positions mapping grid switches
    const switchPositions = [
        { x: -15, z: -15 }, { x: 18, z: -20 },
        { x: -22, z: 12 }, { x: 20, z: 18 }, { x: 2, z: 22 }
    ];

    const switchBoxGeo = new THREE.BoxGeometry(0.4, 0.6, 0.3);
    const leverGeo = new THREE.BoxGeometry(0.1, 0.3, 0.1);

    switchPositions.forEach((pos, idx) => {
        const group = new THREE.Group();
        group.position.set(pos.x, 3, pos.z);

        const base = new THREE.Mesh(switchBoxGeo, new THREE.MeshStandardMaterial({ color: 0x333333 }));
        const lever = new THREE.Mesh(leverGeo, new THREE.MeshStandardMaterial({ color: 0xff0000 }));
        lever.position.set(0, 0, 0.2);
        lever.name = "lever";

        group.add(base);
        group.add(lever);
        group.userData = { id: idx, active: false };

        scene.add(group);
        interactiveObjects.push(group);
    });
}

function checkInteraction() {
    if (!isLocked) return;

    interactiveObjects.forEach((obj) => {
        let dist = camera.position.distanceTo(obj.position);
        if (dist < 4.0 && !obj.userData.active) {
            obj.userData.active = true;
            const lever = obj.getObjectByName("lever");
            if (lever) lever.rotation.x = Math.PI / 3; // Swivel visual link orientation downward

            switchesCount++;
            counterEl.innerText = switchesCount;

            // Step translation calculation for incremental gate open response
            if (switchesCount < 5) {
                escapeDoor.position.x += 0.5; // Slide slightly unhinged to signal progress
            } else {
                escapeDoor.position.y += 6.0; // Instantly wide-open clear frame path upward
                setTimeout(() => {
                    alert("YOU ESCAPED THE GARDEN OF HORROR!");
                    document.exitPointerLock();
                    window.location.href = "index.html"; // Route back tracking context menu page
                }, 500);
            }
        }
    });
}

function animate() {
    requestAnimationFrame(animate);

    if (isLocked) {
        // Player tracking space translation mechanics
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) camera.translateZ(-direction.z * player.speed);
        if (moveLeft || moveRight) camera.translateX(direction.x * player.speed);

        // Keep view planes tethered at exact height level offset bounds
        camera.position.y = player.height;

        // Snap flashlight point ray coordinates inside view frustum context dynamically
        flashlight.position.copy(camera.position);
        const targetPos = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).add(camera.position);
        flashlight.target.position.copy(targetPos);
        flashlight.target.updateMatrixWorld();

        // Calculate proximity nodes mapping to render interaction prompt to make da game work
        let showPrompt = false;
        interactiveObjects.forEach((obj) => {
            let dist = camera.position.distanceTo(obj.position);
            if (dist < 4.0 && !obj.userData.active) {
                showPrompt = true;
            }
        });
        promptEl.style.display = showPrompt ? 'block' : 'none';
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    if (!camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

