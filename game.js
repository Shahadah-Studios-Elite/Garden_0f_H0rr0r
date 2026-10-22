// Ooo noice!
const counterEl = document.getElementById('counter');
const promptEl = document.getElementById('interaction-prompt');

let scene, camera, renderer, clock;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let direction = new THREE.Vector3();
let isLocked = false;

let switchesCount = 0;
let interactiveObjects = [];
let escapeDoor;
let flashlight;

const player = {
    yaw: 0,
    pitch: 0,
    speed: 0.15,
    height: 2
};

window.onload = () => {
    initGame();
    document.body.addEventListener('click', () => {
        if (!isLocked) document.body.requestPointerLock();
    });
};

document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === document.body;
});

document.addEventListener('mousemove', (event) => {
    if (!isLocked) return;
    player.yaw -= event.movementX * 0.0025;
    player.pitch -= event.movementY * 0.0025;
    player.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, player.pitch));

    camera.rotation.set(0, 0, 0);
    camera.rotateY(player.yaw);
    camera.rotateX(player.pitch);
});

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
    scene.fog = new THREE.FogExp2(0x0a0a10, 0.04); 

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, player.height, 22);
    camera.rotation.order = 'YXZ';

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x221111, 0.6);
    scene.add(ambient);

    flashlight = new THREE.SpotLight(0xffffff, 4.0, 40, Math.PI / 4, 0.5, 1);
    flashlight.castShadow = true;
    scene.add(flashlight);

    buildMap();
    animate();
}

function buildMap() {
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2b332b, roughness: 0.6 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a4444, roughness: 0.5 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x662222, roughness: 0.4 });
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x333338, roughness: 0.7 });

    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const ceil = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x15151c, roughness: 0.9 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 8;
    scene.add(ceil);

    const createWall = (w, h, d, x, y, z) => {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
    };

    createWall(60, 8, 1, 0, 4, -30); 
    createWall(60, 8, 1, 0, 4, 30);  
    createWall(1, 8, 60, -30, 4, 0); 
    createWall(1, 8, 60, 30, 4, 0);  

    const pillarGeo = new THREE.BoxGeometry(3, 8, 3);
    const pillarPositions = [{x: -10, z: -5}, {x: 10, z: -5}, {x: -10, z: 10}, {x: 10, z: 10}];
    pillarPositions.forEach(pos => {
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(pos.x, 4, pos.z);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        scene.add(pillar);
    });

    for (let i = 0; i < 6; i++) {
        const frameGeo = new THREE.BoxGeometry(2.5, 3.5, 0.1);
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1a0505'; ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#990000'; ctx.fillRect(16 + i, 10, 32, 40); 
        const artTex = new THREE.CanvasTexture(canvas);
        const artMat = new THREE.MeshStandardMaterial({ map: artTex });

        const frame = new THREE.Mesh(frameGeo, artMat);
        frame.position.set(-29.4, 4, -20 + (i * 8));
        frame.rotation.y = Math.PI / 2;
        scene.add(frame);
    }

    const doorGeo = new THREE.BoxGeometry(6, 6, 0.6);
    escapeDoor = new THREE.Mesh(doorGeo, doorMat);
    escapeDoor.position.set(0, 3, -29.4);
    scene.add(escapeDoor);

    const switchPositions = [
        { x: -15, z: -15 }, { x: 18, z: -20 },
        { x: -22, z: 12 }, { x: 20, z: 18 }, { x: 2, z: 10 }
    ];

    const switchBoxGeo = new THREE.BoxGeometry(0.5, 0.8, 0.4);
    const leverGeo = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    
    const beaconGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    switchPositions.forEach((pos, idx) => {
        const group = new THREE.Group();
        group.position.set(pos.x, 3, pos.z);

        const base = new THREE.Mesh(switchBoxGeo, new THREE.MeshStandardMaterial({ color: 0x222222 }));
        const lever = new THREE.Mesh(leverGeo, new THREE.MeshStandardMaterial({ color: 0xcc1111 }));
        lever.position.set(0, 0, 0.25);
        lever.name = "lever";

        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.set(0, 0.5, 0.2);
        beacon.name = "beacon";

        group.add(base);
        group.add(lever);
        group.add(beacon);
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
            if (lever) lever.rotation.x = Math.PI / 3; 

            const beacon = obj.getObjectByName("beacon");
            if (beacon) beacon.material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

            switchesCount++;
            counterEl.innerText = switchesCount;

            if (switchesCount < 5) {
                escapeDoor.position.x += 0.8; 
            } else {
                escapeDoor.position.y += 6.0; 
                setTimeout(() => {
                    alert("YOU ESCAPED THE GARDEN OF HORROR!");
                    document.exitPointerLock();
                    window.location.href = "index.html"; 
                }, 500);
            }
        }
    });
}

function animate() {
    requestAnimationFrame(animate);

    if (isLocked) {
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) camera.translateZ(-direction.z * player.speed);
        if (moveLeft || moveRight) camera.translateX(direction.x * player.speed);

        camera.position.y = player.height;

        flashlight.position.copy(camera.position);
        const targetPos = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).add(camera.position);
        flashlight.target.position.copy(targetPos);
        flashlight.target.updateMatrixWorld();

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


