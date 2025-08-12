// ===============================================
// Configuración de Firebase
// ===============================================
const firebaseConfig = {
    apiKey: "AIzaSyAsggFpgDFUHRbD17nfcoe9G4Spo_avzZE", 
    authDomain: "control-aceso-rt.firebaseapp.com",
    projectId: "control-aceso-rt",
    storageBucket: "control-aceso-rt.firebasestorage.app",
    messagingSenderId: "320585362063",
    appId: "1:320585362063:web:a5f8e83883b61304b5defa",
    measurementId: "G-3GJ80L2KPR"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const HARDCODED_ADMIN_DNI = 'ADMIN123';

// ===============================================
// Variables de Estado y Sincronización
// ===============================================
let peopleCount = 0;
let isReserved = false;
let insideDNIs = [];
let logs = [];
let alerts = [];
let authorizedUsers = {}; 
let activeReservation = null;
let pendingReservations = [];
let loggedInUser = null; 
let isAdmin = false;

// ===============================================
// Referencias del DOM
// ===============================================
const ELEMENTS = {
    mainDashboard: document.getElementById('mainDashboard'),
    adminDashboard: document.getElementById('adminDashboard'),
    loginSection: document.getElementById('loginSection'),
    loggedInSection: document.getElementById('loggedInSection'),
    welcomeMessage: document.getElementById('welcomeMessage'),
    adminDashboardBtn: document.getElementById('adminDashboardBtn'),
    loginDniInput: document.getElementById('loginDniInput'),
    
    statusIndicator: document.getElementById('statusIndicator'),
    statusText: document.getElementById('statusText'),
    peopleCount: document.getElementById('peopleCount'),

    actionsCard: document.getElementById('actionsCard'),
    checkInForm: document.getElementById('checkInForm'),
    reservationForm: document.getElementById('reservationForm'),
    checkoutSection: document.getElementById('checkoutSection'),
    reservationDetails: document.getElementById('reservationDetails'),
    upcomingReservationsCard: document.getElementById('upcomingReservationsCard'),
    upcomingReservedBy: document.getElementById('upcomingReservedBy'),
    upcomingReservedReason: document.getElementById('upcomingReservedReason'),
    upcomingReservedTime: document.getElementById('upcomingReservedTime'),

    groupSizeInput: document.getElementById('groupSizeInput'),
    reserveName: document.getElementById('reserveName'),
    reservePhone: document.getElementById('reservePhone'),
    reserveReason: document.getElementById('reserveReason'),
    reserveStart: document.getElementById('reserveStart'),
    reserveEnd: document.getElementById('reserveEnd'),

    reservedReason: document.getElementById('reservedReason'),
    reservedBy: document.getElementById('reservedBy'),
    reservedPhone: document.getElementById('reservedPhone'),
    reservedTime: document.getElementById('reservedTime'),

    adminPeopleCount: document.getElementById('adminPeopleCount'),
    adminStatusIndicator: document.getElementById('adminStatusIndicator'),
    adminStatusText: document.getElementById('adminStatusText'),
    activityLogTableBody: document.getElementById('activityLogTable').querySelector('tbody'),
    alertsLogTableBody: document.getElementById('alertsLogTable').querySelector('tbody'),
    pendingReservationsTableBody: document.getElementById('pendingReservationsTable').querySelector('tbody'),
    authorizedDnisTableBody: document.getElementById('authorizedDnisTable').querySelector('tbody'),
    newDniInput: document.getElementById('newDniInput'),
    isAdminCheckbox: document.getElementById('isAdminCheckbox'),
};

// ===============================================
// Funciones de Sincronización con Firebase
// ===============================================
async function loadStateFromFirebase() {
    const adminDoc = await db.collection('authorizedUsers').doc(HARDCODED_ADMIN_DNI).get();
    if (!adminDoc.exists) {
        await addAuthorizedDni(HARDCODED_ADMIN_DNI, true);
    }
    
    db.collection('authorizedUsers').onSnapshot(snapshot => {
        authorizedUsers = {};
        snapshot.forEach(doc => {
            authorizedUsers[doc.id] = doc.data();
        });
        renderAdminTables();
    });

    db.collection('logs').orderBy('timestamp', 'desc').limit(20).onSnapshot(snapshot => {
        logs = [];
        snapshot.forEach(doc => {
            logs.push(doc.data());
        });
        renderAdminTables();
    });
    
    db.collection('appState').doc('main').onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            peopleCount = data.peopleCount || 0;
            insideDNIs = data.insideDNIs || [];
            isReserved = data.isReserved || false;
            activeReservation = data.activeReservation || null;
            pendingReservations = data.pendingReservations || [];
            alerts = data.alerts || [];
            renderMainUI();
        }
    });
}

async function saveAppState() {
    await db.collection('appState').doc('main').set({
        peopleCount: peopleCount,
        insideDNIs: insideDNIs,
        isReserved: isReserved,
        activeReservation: activeReservation,
        pendingReservations: pendingReservations,
        alerts: alerts,
    });
}

async function addLog(logData) {
    await db.collection('logs').add({
        ...logData,
        timestamp: new Date().toLocaleString()
    });
}

async function addAuthorizedDni(dni, isAdmin = false) {
    await db.collection('authorizedUsers').doc(dni).set({ isAdmin, added: new Date() });
    addLog({ type: 'DNI añadido', user: 'admin', details: `DNI: ${dni}` });
}

async function removeAuthorizedDni(dni) {
    await db.collection('authorizedUsers').doc(dni).delete();
    addLog({ type: 'DNI eliminado', user: 'admin', details: `DNI: ${dni}` });
}

// ===============================================
// Lógica de Renderizado y Actualización de UI
// ===============================================
function renderMainUI() {
    checkReservationTime();
    
    ELEMENTS.actionsCard.classList.add('hidden');
    ELEMENTS.checkInForm.classList.add('hidden');
    ELEMENTS.reservationForm.classList.add('hidden');
    ELEMENTS.checkoutSection.classList.add('hidden');
    ELEMENTS.reservationDetails.classList.add('hidden');
    ELEMENTS.upcomingReservationsCard.classList.add('hidden');
    
    const now = new Date();
    if (activeReservation && new Date(activeReservation.startTime) > now) {
        ELEMENTS.upcomingReservationsCard.classList.remove('hidden');
        ELEMENTS.upcomingReservedBy.textContent = activeReservation.name;
        ELEMENTS.upcomingReservedReason.textContent = activeReservation.reason;
        ELEMENTS.upcomingReservedTime.textContent = `${formatDateTime(activeReservation.startTime)} - ${formatDateTime(activeReservation.endTime)}`;
    }
    
    if (isReserved) {
        setIndicatorState('red', '🚫', 'Asociación reservada', 'Reservado');
        ELEMENTS.reservationDetails.classList.remove('hidden');
        updateReservedDetails();
    } else if (peopleCount > 0) {
        setIndicatorState('yellow', '⚠️', 'Asociación con gente', peopleCount);
        ELEMENTS.checkoutSection.classList.remove('hidden');
    } else {
        setIndicatorState('green', '👥', 'Asociación vacía', peopleCount);
        ELEMENTS.actionsCard.classList.remove('hidden');
    }

    if (loggedInUser) {
        ELEMENTS.loginSection.classList.add('hidden');
        ELEMENTS.loggedInSection.classList.remove('hidden');
        ELEMENTS.mainDashboard.classList.remove('hidden');
        ELEMENTS.welcomeMessage.textContent = `Hola, ${loggedInUser}`;
        
        if (isAdmin) {
            ELEMENTS.adminDashboardBtn.classList.remove('hidden');
        } else {
            ELEMENTS.adminDashboardBtn.classList.add('hidden');
        }

        if (insideDNIs.includes(loggedInUser)) {
            ELEMENTS.checkoutSection.classList.remove('hidden');
            ELEMENTS.actionsCard.classList.add('hidden');
        } else {
            ELEMENTS.actionsCard.classList.remove('hidden');
            ELEMENTS.checkoutSection.classList.add('hidden');
        }
    } else {
        ELEMENTS.loginSection.classList.remove('hidden');
        ELEMENTS.loggedInSection.classList.add('hidden');
        ELEMENTS.mainDashboard.classList.remove('hidden');
        ELEMENTS.actionsCard.classList.add('hidden');
        ELEMENTS.checkoutSection.classList.add('hidden');
    }

    updateAdminUI();
}

function setIndicatorState(color, emoji, text, count) {
    // Se ha modificado para usar las nuevas clases del CSS
    ELEMENTS.statusIndicator.className = `status-indicator-container status-indicator-${color}`;
    ELEMENTS.statusText.textContent = text;
    ELEMENTS.peopleCount.textContent = count;
}

function updateReservedDetails() {
    if (activeReservation) {
        ELEMENTS.reservedBy.textContent = activeReservation.name;
        ELEMENTS.reservedReason.textContent = activeReservation.reason;
        ELEMENTS.reservedPhone.textContent = activeReservation.phone;
        ELEMENTS.reservedTime.textContent = `${formatDateTime(activeReservation.startTime)} - ${formatDateTime(activeReservation.endTime)}`;
    }
}

function updateAdminUI() {
    ELEMENTS.adminPeopleCount.textContent = peopleCount;
    // Se ha modificado para usar las nuevas clases del CSS
    ELEMENTS.adminStatusIndicator.className = ELEMENTS.statusIndicator.className;
    ELEMENTS.adminStatusText.textContent = ELEMENTS.statusText.textContent;
    renderAdminTables();
}

function renderAdminTables() {
    ELEMENTS.authorizedDnisTableBody.innerHTML = '';
    Object.keys(authorizedUsers).forEach(dni => {
        const user = authorizedUsers[dni];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${dni}</td>
            <td>${user.isAdmin ? '✅' : '❌'}</td>
            <td>
                <button class="button button-secondary" onclick="removeDni('${dni}')">Eliminar</button>
            </td>
        `;
        ELEMENTS.authorizedDnisTableBody.appendChild(row);
    });

    ELEMENTS.pendingReservationsTableBody.innerHTML = '';
    pendingReservations.forEach((reservation, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${reservation.name}</td>
            <td>${reservation.phone}</td>
            <td>${reservation.reason}</td>
            <td>${formatDateTime(reservation.startTime)} - ${formatDateTime(reservation.endTime)}</td>
            <td>
                <button class="button" onclick="approveReservation(${index})">Aprobar</button>
                <button class="button button-secondary" onclick="rejectReservation(${index})">Rechazar</button>
            </td>
        `;
        ELEMENTS.pendingReservationsTableBody.appendChild(row);
    });

    ELEMENTS.alertsLogTableBody.innerHTML = '';
    alerts.forEach(alert => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${alert.timestamp}</td>
            <td>${alert.type}</td>
            <td>${alert.details}</td>
        `;
        ELEMENTS.alertsLogTableBody.appendChild(row);
    });

    ELEMENTS.activityLogTableBody.innerHTML = '';
    logs.forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${log.timestamp}</td>
            <td>${log.user}</td>
            <td>${log.type.replace('-', ' ').replace(/(^|\s)\w/g, c => c.toUpperCase())}</td>
            <td>${log.people || log.reason || log.details || 'N/A'}</td>
        `;
        ELEMENTS.activityLogTableBody.appendChild(row);
    });
}

// ===============================================
// Funciones de Cookies
// ===============================================
function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
    const cname = name + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(cname) === 0) {
            return c.substring(cname.length, c.length);
        }
    }
    return "";
}

// ===============================================
// Lógica de Login/Logout
// ===============================================
async function loginUser() {
    const dni = ELEMENTS.loginDniInput.value.trim().toUpperCase();
    if (!dni) {
        alert('Introduce un DNI para iniciar sesión.');
        return;
    }

    if (dni === HARDCODED_ADMIN_DNI) {
        loggedInUser = dni;
        isAdmin = true;
        setCookie('userDni', dni, 30);
        renderMainUI();
        ELEMENTS.loginDniInput.value = '';
    } else {
        const userDoc = await db.collection('authorizedUsers').doc(dni).get();
        if (userDoc.exists) {
            loggedInUser = dni;
            isAdmin = userDoc.data().isAdmin || false;
            setCookie('userDni', dni, 30);
            renderMainUI();
            ELEMENTS.loginDniInput.value = '';
        } else {
            alert('DNI no autorizado.');
        }
    }
}

function logoutUser() {
    loggedInUser = null;
    isAdmin = false;
    setCookie('userDni', '', -1);
    ELEMENTS.mainDashboard.classList.add('hidden');
    ELEMENTS.adminDashboard.classList.add('hidden');
    renderMainUI();
}

// ===============================================
// Funciones de Eventos de Usuario
// ===============================================
function showCheckInForm() {
    if (!loggedInUser) {
        alert('Debes iniciar sesión para hacer check-in.');
        return;
    }
    if (isReserved) {
        alert('El local está reservado. No se pueden realizar check-ins.');
        return;
    }
    ELEMENTS.actionsCard.classList.add('hidden');
    ELEMENTS.checkInForm.classList.remove('hidden');
}

function processCheckIn() {
    const dni = loggedInUser;
    const groupSize = parseInt(ELEMENTS.groupSizeInput.value) || 0;
    const totalPeople = 1 + groupSize;

    if (insideDNIs.includes(dni)) {
        alert('Ya estás dentro.');
        return;
    }
    
    insideDNIs.push(dni);
    peopleCount += totalPeople;
    addLog({ type: 'check-in', user: dni, people: totalPeople });
    alert(`Check-in registrado. ¡Bienvenido/a! (Total: ${totalPeople} personas)`);
    ELEMENTS.groupSizeInput.value = '0';
    ELEMENTS.checkInForm.classList.add('hidden');
    saveAppState();
}

function showReservationForm() {
    if (!loggedInUser) {
        alert('Debes iniciar sesión para solicitar una reserva.');
        return;
    }
    if (isReserved || pendingReservations.length > 0) {
        alert('Ya existe una reserva activa o pendiente.');
        return;
    }
    ELEMENTS.actionsCard.classList.add('hidden');
    ELEMENTS.reservationForm.classList.remove('hidden');
    ELEMENTS.reserveName.value = loggedInUser;
    ELEMENTS.reserveName.focus();
}

function processReservation() {
    const name = ELEMENTS.reserveName.value.trim();
    const phone = ELEMENTS.reservePhone.value.trim();
    const reason = ELEMENTS.reserveReason.value.trim();
    const startTime = ELEMENTS.reserveStart.value;
    const endTime = ELEMENTS.reserveEnd.value;

    if (!name || !phone || !reason || !startTime || !endTime) {
        alert('Por favor, completa todos los campos para la reserva.');
        return;
    }
    
    const reservation = { name, phone, reason, startTime, endTime };
    pendingReservations.push(reservation);
    addLog({ type: 'reservation-request', user: name, reason });
    
    alert('Solicitud de reserva enviada. Contacta con un administrador para que la apruebe.');
    ELEMENTS.reservationForm.classList.add('hidden');
    saveAppState();
}

function endReservation() {
    if (!isAdmin && loggedInUser !== activeReservation?.name) {
        alert('No tienes permisos para finalizar esta reserva.');
        return;
    }

    if (confirm('¿Estás seguro de que quieres finalizar la reserva?')) {
        isReserved = false;
        activeReservation = null;
        addLog({ type: 'reservation-ended', user: loggedInUser }); // El registro es ahora más preciso
        alert('Reserva finalizada.');
        saveAppState();
    }
}

function checkOutSingle() {
    const dni = loggedInUser;
    if (!dni || !insideDNIs.includes(dni)) {
        alert('No estás registrado como dentro del local.');
        return;
    }

    insideDNIs.splice(insideDNIs.indexOf(dni), 1);
    peopleCount--;
    addLog({ type: 'check-out-single', user: dni });
    alert('Check-out individual registrado. Hasta pronto.');
    saveAppState();
}

function checkOutGroup() {
    if (peopleCount > 0) {
        const groupSize = peopleCount;
        const exitingUsers = [...insideDNIs];
        insideDNIs = [];
        peopleCount = 0;
        addLog({ type: 'check-out-group', user: 'all', people: groupSize, details: `Salieron: ${exitingUsers.join(', ')}` });
        alert(`Check-out de grupo (${groupSize} personas) registrado. Hasta pronto.`);
    } else {
        alert('No hay grupo para hacer check-out.');
    }
    saveAppState();
}

function checkReservationTime() {
    if (activeReservation && !isReserved) {
        const now = new Date();
        const startTime = new Date(activeReservation.startTime);
        if (now >= startTime) {
            isReserved = true;
            peopleCount = 0;
            insideDNIs = [];
            addLog({ type: 'reservation-started', user: activeReservation.name });
            alert('¡El local ha sido reservado y está ahora ocupado!');
            saveAppState();
        }
    }
}

// ===============================================
// Funciones del Panel de Administración
// ===============================================
function showAdminDashboard() {
    if (isAdmin) {
        ELEMENTS.mainDashboard.classList.add('hidden');
        ELEMENTS.adminDashboard.classList.remove('hidden');
        updateAdminUI();
    } else {
        alert('Acceso denegado. No eres administrador.');
    }
}

function backToDashboard() {
    ELEMENTS.adminDashboard.classList.add('hidden');
    ELEMENTS.mainDashboard.classList.remove('hidden');
    renderMainUI();
}

function resetAll() {
    if (confirm('⚠️ ¿Estás seguro? Esto borrará todos los datos de forma permanente y no se puede deshacer.')) {
        peopleCount = 0;
        isReserved = false;
        insideDNIs = [];
        activeReservation = null;
        pendingReservations = [];
        alerts = [];

        db.collection('logs').get().then(snapshot => snapshot.forEach(doc => doc.ref.delete()));
        db.collection('authorizedUsers').get().then(snapshot => snapshot.forEach(doc => doc.ref.delete()));
        
        saveAppState();

        alert('Todos los datos han sido reseteados.');
        backToDashboard();
    }
}

function approveReservation(index) {
    if (confirm('¿Quieres aprobar esta reserva? El local se marcará como reservado en la fecha y hora indicadas.')) {
        const reservationToApprove = pendingReservations.splice(index, 1)[0];
        activeReservation = reservationToApprove;
        addLog({ type: 'reservation-approved', user: 'admin', details: `Reserva de ${activeReservation.name}` });
        alert('Reserva aprobada. El local se ocupará automáticamente en la fecha de inicio.');
        saveAppState();
    }
}

function rejectReservation(index) {
    if (confirm('¿Estás seguro de que quieres rechazar esta reserva?')) {
        const rejectedReservation = pendingReservations.splice(index, 1)[0];
        addLog({ type: 'reservation-rejected', user: 'admin', details: `Reserva de ${rejectedReservation.name}` });
        alert('Reserva rechazada.');
        saveAppState();
    }
}

async function addDni() {
    const newDni = ELEMENTS.newDniInput.value.trim().toUpperCase();
    const isAdminUser = ELEMENTS.isAdminCheckbox.checked;

    if (!newDni) {
        alert('El DNI no puede estar vacío.');
        return;
    }

    if (newDni === HARDCODED_ADMIN_DNI) {
        alert('No puedes añadir o modificar el DNI de administrador por defecto.');
        return;
    }

    const userDoc = await db.collection('authorizedUsers').doc(newDni).get();

    if (userDoc.exists) {
        alert('Este DNI ya existe en la base de datos.');
    } else {
        await addAuthorizedDni(newDni, isAdminUser);
        alert(`DNI ${newDni} añadido correctamente.`);
        ELEMENTS.newDniInput.value = '';
        ELEMENTS.isAdminCheckbox.checked = false;
    }
}

function removeDni(dni) {
    if (confirm(`¿Quieres eliminar el DNI ${dni}?`)) {
        removeAuthorizedDni(dni);
    }
}

// ===============================================
// Funciones de Utilidad y Event Listeners
// ===============================================
function formatDateTime(datetime) {
    const d = new Date(datetime);
    return d.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

document.addEventListener('DOMContentLoaded', () => {
    firebase.auth().signInAnonymously().then(() => {
        loadStateFromFirebase();
        
        const storedDni = getCookie('userDni');
        if (storedDni) {
            ELEMENTS.loginDniInput.value = storedDni;
            loginUser();
        } else {
            renderMainUI();
        }

        setInterval(checkReservationTime, 10000); 
    });

    document.getElementById('loginBtn').addEventListener('click', loginUser);
    document.getElementById('logoutBtn').addEventListener('click', logoutUser);
    document.getElementById('adminDashboardBtn').addEventListener('click', showAdminDashboard);

    document.getElementById('checkInBtn').addEventListener('click', showCheckInForm);
    document.getElementById('reserveBtn').addEventListener('click', showReservationForm);
    
    document.getElementById('confirmCheckInBtn').addEventListener('click', processCheckIn);
    document.getElementById('cancelCheckInBtn').addEventListener('click', () => { ELEMENTS.checkInForm.classList.add('hidden'); renderMainUI(); });

    document.getElementById('confirmReservationBtn').addEventListener('click', processReservation);
    document.getElementById('cancelReservationBtn').addEventListener('click', () => { ELEMENTS.reservationForm.classList.add('hidden'); renderMainUI(); });

    document.getElementById('endReservationBtn').addEventListener('click', endReservation);
    document.getElementById('checkoutSingleBtn').addEventListener('click', checkOutSingle);
    document.getElementById('checkoutGroupBtn').addEventListener('click', checkOutGroup);
    
    document.getElementById('backToDashboardBtn').addEventListener('click', backToDashboard);
    document.getElementById('resetAllBtn').addEventListener('click', resetAll);
    document.getElementById('addDniBtn').addEventListener('click', addDni);
});