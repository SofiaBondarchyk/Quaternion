let scene, camera, renderer, controls, objectControls;
let currentObject = null;
let isAnimating = false;
let rotationDisplay = document.getElementById('rotationValues');
let rotationSpeedDisplay = document.getElementById('rotationSpeed');
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
const textureLoader = new THREE.TextureLoader();
let previousQuaternion = new THREE.Quaternion();
let previousTime = performance.now();
let ambientLight, directionalLight, trajectoryLine;

function init() {
    // Створення сцени
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x696969); // Світло-сірий колір фону

    // Створення камери
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // Створення рендерера
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight); // Сцена не на весь екран
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Додавання освітлення
    ambientLight = new THREE.AmbientLight(0x404040, 1); // м'яке освітлення
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // Додавання осей координат
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // Додавання сітки
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    // Додавання орбітальних контролів для сцени
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', updateRotationDisplay);

    // Додавання орбітальних контролів для об'єкта
    objectControls = new THREE.OrbitControls(camera, renderer.domElement);
    objectControls.enabled = false;
    objectControls.enableRotate = true;
    objectControls.enablePan = false;
    objectControls.enableZoom = false;
    objectControls.addEventListener('change', () => {
        updateRotationDisplay();
        if (currentObject) {
            currentObject.quaternion.copy(camera.quaternion);
        }
    });

    // Обробка подій миші для повороту об'єкта
    document.addEventListener('mousedown', (event) => {
        if (document.getElementById('rotationMode').value === 'object') {
            isDragging = true;
            previousMousePosition = { x: event.clientX, y: event.clientY };
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    document.addEventListener('mousemove', (event) => {
        if (!isDragging || document.getElementById('rotationMode').value !== 'object') return;

        const deltaMove = {
            x: event.clientX - previousMousePosition.x,
            y: event.clientY - previousMousePosition.y
        };

        const deltaRotationQuaternion = new THREE.Quaternion()
            .setFromEuler(new THREE.Euler(
                THREE.MathUtils.degToRad(deltaMove.y * 0.5),
                THREE.MathUtils.degToRad(deltaMove.x * 0.5),
                0,
                'XYZ'
            ));

        if (currentObject) {
            currentObject.quaternion.multiplyQuaternions(deltaRotationQuaternion, currentObject.quaternion);
        }
        previousMousePosition = { x: event.clientX, y: event.clientY };
    });

    document.getElementById('applySceneColor').addEventListener('click', () => {
        const sceneColor = document.getElementById('sceneColor').value;
        scene.background = new THREE.Color(sceneColor);
    });

    document.getElementById('ambientLightColor').addEventListener('input', () => {
        const ambientLightColor = document.getElementById('ambientLightColor').value;
        ambientLight.color.set(ambientLightColor);
    });

    document.getElementById('ambientLightIntensity').addEventListener('input', () => {
        const ambientLightIntensity = parseFloat(document.getElementById('ambientLightIntensity').value);
        ambientLight.intensity = ambientLightIntensity;
    });

    document.getElementById('directionalLightColor').addEventListener('input', () => {
        const directionalLightColor = document.getElementById('directionalLightColor').value;
        directionalLight.color.set(directionalLightColor);
    });

    document.getElementById('directionalLightIntensity').addEventListener('input', () => {
        const directionalLightIntensity = parseFloat(document.getElementById('directionalLightIntensity').value);
        directionalLight.intensity = directionalLightIntensity;
    });

    document.getElementById('rotationType').addEventListener('change', updateRotationInputs);

    // Слайдери для керування положенням літака
    document.getElementById('positionX').addEventListener('input', updateObjectPosition);
    document.getElementById('positionY').addEventListener('input', updateObjectPosition);
    document.getElementById('positionZ').addEventListener('input', updateObjectPosition);

    document.getElementById('saveConfig').addEventListener('click', saveConfig);
    document.getElementById('loadConfig').addEventListener('click', loadConfig);
    document.getElementById('saveImage').addEventListener('click', saveImage);
    document.getElementById('animateTrajectory').addEventListener('click', animateTrajectory);

    animate();
}

function createPlane(color) {
    const planeGroup = new THREE.Group();

    // Використання кольорів замість текстур
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: color });
    const wingMaterial = new THREE.MeshStandardMaterial({ color: color });
    const tailMaterial = new THREE.MeshStandardMaterial({ color: color });
    const propellerMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const cockpitMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, transparent: true, opacity: 0.8 });

    // Фюзеляж
    const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1.5, 32);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2;
    planeGroup.add(body);

    // Крила
    const wingGeometry = new THREE.BoxGeometry(0.1, 1, 0.5);
    const wing1 = new THREE.Mesh(wingGeometry, wingMaterial);
    wing1.position.set(0, 0.5, 0);
    const wing2 = wing1.clone();
    wing2.position.set(0, -0.5, 0);
    planeGroup.add(wing1);
    planeGroup.add(wing2);

    // Хвіст
    const tailGeometry = new THREE.BoxGeometry(0.05, 0.3, 0.3);
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.set(-0.75, 0, 0);
    planeGroup.add(tail);

    // Хвостові крила
    const tailWingGeometry = new THREE.BoxGeometry(0.05, 0.5, 0.1);
    const tailWing1 = new THREE.Mesh(tailWingGeometry, tailMaterial);
    tailWing1.position.set(-0.75, 0, 0.15);
    const tailWing2 = tailWing1.clone();
    tailWing2.position.set(-0.75, 0, -0.15);
    planeGroup.add(tailWing1);
    planeGroup.add(tailWing2);

    // Пропелери
    const propellerGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.5);
    const propeller1 = new THREE.Mesh(propellerGeometry, propellerMaterial);
    propeller1.position.set(0.75, 0, 0);
    planeGroup.add(propeller1);

    // Кабіна
    const cockpitGeometry = new THREE.SphereGeometry(0.15, 32, 32);
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(-0.5, 0, 0);
    planeGroup.add(cockpit);

    // Шасі
    const wheelGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 32);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const wheel1 = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel1.rotation.z = Math.PI / 2;
    wheel1.position.set(0.5, -0.2, 0.25);
    const wheel2 = wheel1.clone();
    wheel2.position.set(0.5, -0.2, -0.25);
    const wheel3 = wheel1.clone();
    wheel3.position.set(-0.5, -0.2, 0);
    planeGroup.add(wheel1);
    planeGroup.add(wheel2);
    planeGroup.add(wheel3);

    planeGroup.userData.propeller = propeller1; // Зберігаємо пропелер для анімації

    if (currentObject) {
        scene.remove(currentObject);
    }

    currentObject = planeGroup;
    scene.add(currentObject);
    objectControls.target = currentObject.position;
}

function createObject(type, color, size, materialType) {
    if (type === 'plane') {
        createPlane(color); // Викликаємо функцію для створення літака
        return;
    }

    let geometry;
    switch (type) {
        case 'cube':
            geometry = new THREE.BoxGeometry(size, size, size);
            break;
        case 'cone':
            geometry = new THREE.ConeGeometry(size / 2, size, 32);
            break;
        case 'sphere':
            geometry = new THREE.SphereGeometry(size / 2, 32, 32);
            break;
        case 'torus':
            geometry = new THREE.TorusGeometry(size / 2, size / 6, 16, 100);
            break;
        case 'cylinder':
            geometry = new THREE.CylinderGeometry(size / 2, size / 2, size, 32);
            break;
    }

    let material;
    switch (materialType) {
        case 'standard':
            material = new THREE.MeshStandardMaterial({ 
                color: color, 
                roughness: 0.7, 
                metalness: 0.3,
                envMapIntensity: 0.5,
                emissive: 0x0,
                emissiveIntensity: 0.1 
            });
            break;
        case 'phong':
            material = new THREE.MeshPhongMaterial({ 
                color: color, 
                shininess: 100, 
                specular: 0x555555, 
                reflectivity: 0.5,
                emissive: 0x111111,
                emissiveIntensity: 0.3 
            });
            break;
        case 'lambert':
            material = new THREE.MeshLambertMaterial({ 
                color: color, 
                emissive: 0x222222, 
                emissiveIntensity: 0.5,
                wireframe: false,
                opacity: 0.8,
                transparent: true 
            });
            break;
    }

    const object = new THREE.Mesh(geometry, material);

    if (currentObject) {
        scene.remove(currentObject);
    }

    currentObject = object;
    scene.add(currentObject);
    objectControls.target = currentObject.position;
}

function resetObject() {
    if (currentObject) {
        scene.remove(currentObject);
        currentObject = null;
    }
}

function updatePlaneColor(color) {
    if (currentObject && currentObject.type === 'Group') {
        currentObject.children.forEach(child => {
            if (child.material) {
                child.material.color.set(color);
            }
        });
    }
}

function updateObjectPosition() {
    if (!currentObject) return;

    const posX = parseFloat(document.getElementById('positionX').value);
    const posY = parseFloat(document.getElementById('positionY').value);
    const posZ = parseFloat(document.getElementById('positionZ').value);

    currentObject.position.set(posX, posY, posZ);
}

document.getElementById('createObject').addEventListener('click', () => {
    const objectType = document.getElementById('objectType').value;
    const color = document.getElementById('colorPicker').value;
    const size = parseFloat(document.getElementById('size').value);
    const materialType = document.getElementById('materialType').value;
    createObject(objectType, color, size, materialType);
});

document.getElementById('resetObject').addEventListener('click', resetObject);

document.getElementById('applyRotation').addEventListener('click', () => {
    const rotationType = document.getElementById('rotationType').value;
    const normalizeQuaternion = document.getElementById('normalizeQuaternion').checked;
    applyRotation(rotationType, normalizeQuaternion);
});

document.getElementById('controlMode').addEventListener('change', () => {
    const controlMode = document.getElementById('controlMode').value;
    if (controlMode === 'rotateObject') {
        controls.enabled = false;
        objectControls.enabled = true;
    } else {
        controls.enabled = true;
        objectControls.enabled = false;
    }
});

document.getElementById('colorPicker').addEventListener('input', (event) => {
    const color = event.target.value;
    updatePlaneColor(color);
});

function updateRotationInputs() {
    const rotationType = document.getElementById('rotationType').value;
    const quaternionInputs = document.getElementById('quaternionInputs');
    const eulerInputs = document.getElementById('eulerInputs');
    const matrixInputs = document.getElementById('matrixInputs');

    quaternionInputs.style.display = 'none';
    eulerInputs.style.display = 'none';
    matrixInputs.style.display = 'none';

    if (rotationType === 'quaternion') {
        quaternionInputs.style.display = 'block';
    } else if (rotationType === 'euler') {
        eulerInputs.style.display = 'block';
    } else if (rotationType === 'matrix') {
        matrixInputs.style.display = 'block';
    }
}

// Функція завантаження STL файлу
function loadSTL(file) {
    const loader = new THREE.STLLoader();
    loader.load(URL.createObjectURL(file), (geometry) => {
        const material = new THREE.MeshStandardMaterial({ color: 0x606060 });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        currentObject = mesh; // Зберігаємо поточний об'єкт
    });
}

// Функція завантаження OBJ файлу
function loadOBJ(file) {
    const loader = new THREE.OBJLoader();
    loader.load(URL.createObjectURL(file), (object) => {
        scene.add(object);
        currentObject = object; // Зберігаємо поточний об'єкт
    });
}

// Функція завантаження FBX файлу
function loadFBX(file) {
    const loader = new THREE.FBXLoader();
    loader.load(URL.createObjectURL(file), (object) => {
        scene.add(object);
        currentObject = object; // Зберігаємо поточний об'єкт
    });
}

// Функція завантаження GLTF/GLB файлу
function loadGLTF(file) {
    const loader = new THREE.GLTFLoader();
    loader.load(URL.createObjectURL(file), (gltf) => {
        scene.add(gltf.scene);
        currentObject = gltf.scene; // Зберігаємо поточний об'єкт
    });
}

// Обробник події зміни файлу для імпорту моделей
document.getElementById('importModel').addEventListener('change', (event) => {
    const file = event.target.files[0];
    const extension = file.name.split('.').pop().toLowerCase();
    switch (extension) {
        case 'stl':
            loadSTL(file);
            break;
        case 'obj':
            loadOBJ(file);
            break;
        case 'fbx':
            loadFBX(file);
            break;
        case 'gltf':
        case 'glb':
            loadGLTF(file);
            break;
        default:
            alert('Непідтримуваний формат файлу');
    }
});

// Функція експорту моделі
function exportModel(format) {
    if (!currentObject) return;

    const exporter = new THREE.GLTFExporter();
    exporter.parse(currentObject, (gltf) => {
        let blob;
        if (format === 'gltf') {
            blob = new Blob([JSON.stringify(gltf)], { type: 'application/json' });
        } else if (format === 'glb') {
            exporter.parse(currentObject, (result) => {
                blob = new Blob([result], { type: 'application/octet-stream' });
            }, { binary: true });
        }
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `model.${format}`;
        link.click();
    });
}

function applyRotation(rotationType, normalizeQuaternion) {
    if (!currentObject) return;

    if (rotationType === 'quaternion') {
        const qx = parseFloat(document.getElementById('qx').value);
        const qy = parseFloat(document.getElementById('qy').value);
        const qz = parseFloat(document.getElementById('qz').value);
        const qw = parseFloat(document.getElementById('qw').value);
        let quaternion = new THREE.Quaternion(qx, qy, qz, qw);
        if (normalizeQuaternion) {
            quaternion.normalize();
        }
        animateRotation(quaternion);
    } else if (rotationType === 'euler') {
        const ex = THREE.Math.degToRad(parseFloat(document.getElementById('ex').value));
        const ey = THREE.Math.degToRad(parseFloat(document.getElementById('ey').value));
        const ez = THREE.Math.degToRad(parseFloat(document.getElementById('ez').value));
        const euler = new THREE.Euler(ex, ey, ez, 'XYZ');
        const quaternion = new THREE.Quaternion().setFromEuler(euler);
        animateRotation(quaternion);
    } else if (rotationType === 'matrix') {
        const m11 = parseFloat(document.getElementById('m11').value);
        const m12 = parseFloat(document.getElementById('m12').value);
        const m13 = parseFloat(document.getElementById('m13').value);
        const m21 = parseFloat(document.getElementById('m21').value);
        const m22 = parseFloat(document.getElementById('m22').value);
        const m23 = parseFloat(document.getElementById('m23').value);
        const m31 = parseFloat(document.getElementById('m31').value);
        const m32 = parseFloat(document.getElementById('m32').value);
        const m33 = parseFloat(document.getElementById('m33').value);

        const matrix = new THREE.Matrix4();
        matrix.set(
            m11, m12, m13, 0,
            m21, m22, m23, 0,
            m31, m32, m33, 0,
            0, 0, 0, 1
        );

        const quaternion = new THREE.Quaternion().setFromRotationMatrix(matrix);
        animateRotation(quaternion);
    }
    updateRotationSpeed();
    updateRotationDisplay();
}

function animateRotation(target) {
    if (!currentObject) return;

    isAnimating = true;
    let start = null;
    const duration = 1000;
    const initialQuaternion = currentObject.quaternion.clone();

    function animate(time) {
        if (!start) start = time;
        const progress = (time - start) / duration;

        if (progress < 1) {
            requestAnimationFrame(animate);
            const interpolatedQuaternion = initialQuaternion.clone().slerp(target, progress);
            currentObject.quaternion.copy(interpolatedQuaternion);
        } else {
            isAnimating = false;
            currentObject.quaternion.copy(target);
        }

        updateRotationDisplay();
        updateRotationSpeed();
    }

    requestAnimationFrame(animate);
}

function updateRotationDisplay() {
    if (!currentObject) return;

    const quaternion = currentObject.quaternion || new THREE.Quaternion();
    const euler = currentObject.rotation || new THREE.Euler();
    const matrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);

    const elements = matrix.elements || [];

    rotationDisplay.innerHTML = `
        <b>Quaternion:</b> (${(quaternion.x || 0).toFixed(2)}, ${(quaternion.y || 0).toFixed(2)}, ${(quaternion.z || 0).toFixed(2)}, ${(quaternion.w || 0).toFixed(2)})<br>
        <b>Euler Angles:</b> (${THREE.Math.radToDeg(euler.x || 0).toFixed(2)}°, ${THREE.Math.radToDeg(euler.y || 0).toFixed(2)}°, ${THREE.Math.radToDeg(euler.z || 0).toFixed(2)}°)<br>
        <b>Rotation Matrix:</b><br>
        [${(elements[0] || 0).toFixed(2)}, ${(elements[1] || 0).toFixed(2)}, ${(elements[2] || 0).toFixed(2)}]<br>
        [${(elements[4] || 0).toFixed(2)}, ${(elements[5] || 0).toFixed(2)}, ${(elements[6] || 0).toFixed(2)}]<br>
        [${(elements[8] || 0).toFixed(2)}, ${(elements[9] || 0).toFixed(2)}, ${(elements[10] || 0).toFixed(2)}]
    `;
}

document.getElementById('demonstrateGimbalLock').addEventListener('click', () => {
    if (!currentObject) return;

    // Встановлюємо обертання об'єкта на 90 градусів навколо осі Y
    currentObject.rotation.set(THREE.Math.degToRad(0), THREE.Math.degToRad(90), THREE.Math.degToRad(0));

    // Додаємо обертання навколо осі X після обертання навколо осі Y
    document.addEventListener('keydown', onDocumentKeyDown, false);
});

function onDocumentKeyDown(event) {
    if (!currentObject) return;

    switch (event.keyCode) {
        case 37: // стрілка вліво
            currentObject.rotation.x -= 0.1;
            break;
        case 39: // стрілка вправо
            currentObject.rotation.x += 0.1;
            break;
    }
    updateRotationDisplay();
}

function updateRotationSpeed() {
    if (!currentObject) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - previousTime) / 1000; // Переведення в секунди

    const currentQuaternion = currentObject.quaternion.clone();
    const deltaQuaternion = new THREE.Quaternion().copy(currentQuaternion).invert().multiply(previousQuaternion);

    const angle = 2 * Math.acos(deltaQuaternion.w); // Кут обертання в радіанах
    const angularSpeed = angle / deltaTime; // Швидкість обертання в радіанах за секунду

    if (rotationSpeedDisplay) {
        rotationSpeedDisplay.textContent = angularSpeed.toFixed(2) + ' rad/s';
    }

    previousQuaternion.copy(currentQuaternion);
    previousTime = currentTime;
}

function animateTrajectory() {
    if (!currentObject) return;

    const trajectoryType = document.getElementById('trajectoryType').value;
    const duration = parseInt(document.getElementById('trajectoryDuration').value);
    const initialPosition = currentObject.position.clone();
    const initialQuaternion = currentObject.quaternion.clone();
    const path = new THREE.CurvePath();

    // Визначаємо кінцеву позицію з урахуванням початкового повороту
    const endPosition = initialPosition.clone().add(new THREE.Vector3(5, 0, 0).applyQuaternion(initialQuaternion));

    if (trajectoryType === 'line') {
        path.add(new THREE.LineCurve3(initialPosition, endPosition));
    } else if (trajectoryType === 'curve') {
        const controlPoint1 = initialPosition.clone().add(new THREE.Vector3(2, 2, 0).applyQuaternion(initialQuaternion));
        const controlPoint2 = initialPosition.clone().add(new THREE.Vector3(3, -2, 0).applyQuaternion(initialQuaternion));
        path.add(new THREE.CubicBezierCurve3(initialPosition, controlPoint1, controlPoint2, endPosition));
    }

    // Додаємо видимість траєкторії
    const points = path.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    if (trajectoryLine) {
        scene.remove(trajectoryLine);
    }
    trajectoryLine = new THREE.Line(geometry, material);
    scene.add(trajectoryLine);

    let start = null;
    function animate(time) {
        if (!start) start = time;
        const progress = (time - start) / duration;

        if (progress < 1) {
            requestAnimationFrame(animate);
            const point = path.getPoint(progress);
            currentObject.position.copy(point);
            currentObject.quaternion.copy(initialQuaternion); // Зберігаємо початковий кут повороту
        } else {
            currentObject.position.copy(initialPosition);
        }

        renderer.render(scene, camera);
    }

    requestAnimationFrame(animate);
}

function animate() {
   

    requestAnimationFrame(animate);

    // Анімація пропелера
    if (currentObject && currentObject.userData.propeller) {
        currentObject.userData.propeller.rotation.x += 0.1;
    }

    if (!isAnimating && document.getElementById('controlMode').value === 'rotateObject' && currentObject) {
        currentObject.rotation.x += 0.01;
        currentObject.rotation.y += 0.01;
        updateRotationDisplay();
    }

    controls.update();
    renderer.render(scene, camera);
}

function saveConfig() {
    if (!currentObject) return;

    const config = {
        type: document.getElementById('objectType').value,
        color: document.getElementById('colorPicker').value,
        size: parseFloat(document.getElementById('size').value),
        materialType: document.getElementById('materialType').value,
        position: {
            x: currentObject.position.x,
            y: currentObject.position.y,
            z: currentObject.position.z
        },
        quaternion: {
            x: currentObject.quaternion.x,
            y: currentObject.quaternion.y,
            z: currentObject.quaternion.z,
            w: currentObject.quaternion.w
        }
    };

    localStorage.setItem('objectConfig', JSON.stringify(config));
    alert('Configuration saved!');
}

function loadConfig() {
    const config = JSON.parse(localStorage.getItem('objectConfig'));
    if (!config) {
        alert('No configuration found!');
        return;
    }

    createObject(config.type, config.color, config.size, config.materialType);
    currentObject.position.set(config.position.x, config.position.y, config.position.z);
    currentObject.quaternion.set(config.quaternion.x, config.quaternion.y, config.quaternion.z, config.quaternion.w);
    updateRotationDisplay();
    alert('Configuration loaded!');
}

function saveImage() {
    renderer.render(scene, camera); // Переконайтеся, що сцена рендериться перед збереженням

    const imgData = renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = imgData;
    link.download = 'scene.png';
    link.click();
}

document.getElementById('helpButton').addEventListener('click', () => {
    introJs().setOptions({
        steps: [
            {
                intro: "Welcome to the 3D Object Rotation Calculator! Let's take a tour."
            },
            {
                element: document.getElementById('objectType'),
                intro: "Select the type of object you want to create."
            },
            {
                element: document.getElementById('materialType'),
                intro: "Choose the material type for your object."
            },
            {
                element: document.getElementById('colorPicker'),
                intro: "Pick a color for your object."
            },
            {
                element: document.getElementById('size'),
                intro: "Set the size of your object."
            },
            {
                element: document.getElementById('createObject'),
                intro: "Click here to create the object."
            },
            {
                element: document.getElementById('resetObject'),
                intro: "Click here to reset the object."
            },
            {
                element: document.getElementById('importModel'),
                intro: "Import a model from your device."
            },
            {
                element: document.getElementById('trajectoryType'),
                intro: "Select the type of trajectory for the object."
            },
            {
                element: document.getElementById('trajectoryDuration'),
                intro: "Set the duration for the trajectory animation."
            },
            {
                element: document.getElementById('animateTrajectory'),
                intro: "Click here to animate the trajectory."
            },
            {
                element: document.getElementById('rotationType'),
                intro: "Choose the rotation type: Quaternion, Euler Angles, or Rotation Matrix."
            },
            {
                element: document.getElementById('applyRotation'),
                intro: "Apply the rotation to your object."
            },
            {
                element: document.getElementById('sceneColor'),
                intro: "Set the background color of the scene."
            },
            {
                element: document.getElementById('ambientLightColor'),
                intro: "Set the color of the ambient light."
            },
            {
                element: document.getElementById('ambientLightIntensity'),
                intro: "Adjust the intensity of the ambient light."
            },
            {
                element: document.getElementById('directionalLightColor'),
                intro: "Set the color of the directional light."
            },
            {
                element: document.getElementById('directionalLightIntensity'),
                intro: "Adjust the intensity of the directional light."
            },
            {
                element: document.getElementById('controlMode'),
                intro: "Select the control mode: Rotate Object or Rotate Scene."
            },
            {
                element: document.getElementById('rotationMode'),
                intro: "Select the mouse rotation mode: Rotate Object or Rotate Scene."
            },
            {
                element: document.getElementById('saveConfig'),
                intro: "Save the current configuration of the object."
            },
            {
                element: document.getElementById('loadConfig'),
                intro: "Load a previously saved configuration."
            },
            {
                element: document.getElementById('saveImage'),
                intro: "Save the current scene as an image."
            },
            {
                element: document.getElementById('rotationValues'),
                intro: "View the current rotation values of the object."
            },
            {
                element: document.getElementById('rotationSpeed'),
                intro: "View the current rotation speed of the object."
            },
            {
                element: document.getElementById('positionX'),
                intro: "Adjust the X position of your object."
            },
            {
                element: document.getElementById('positionY'),
                intro: "Adjust the Y position of your object."
            },
            {
                element: document.getElementById('positionZ'),
                intro: "Adjust the Z position of your object."
            }
        ]
    }).start();
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight); // Сцена не на весь екран
});

init();
updateRotationInputs();