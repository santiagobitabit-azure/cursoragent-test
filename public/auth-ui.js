let currentUser = null;
let predictionsCache = {};

const authBar = () => document.getElementById("auth-bar");
const authModal = () => document.getElementById("auth-modal");
const authForm = () => document.getElementById("auth-form");
const authTitle = () => document.getElementById("auth-modal-title");
const authError = () => document.getElementById("auth-error");
const nameField = () => document.getElementById("auth-name-field");
const microsoftSection = () => document.getElementById("auth-microsoft-section");

let authMode = "login";

function updateMicrosoftVisibility() {
  const section = microsoftSection();
  if (!section) return;
  section.hidden = !window.MicrosoftAuth?.isEnabled?.();
}

async function completeLogin(data) {
  AuthAPI.setToken(data.token);
  currentUser = data.user;
  closeAuthModal();
  await loadPredictions();
  renderAuthBar();
  if (typeof updateAdminTabVisibility === "function") updateAdminTabVisibility();
  window.dispatchEvent(new CustomEvent("auth:change", { detail: { user: currentUser } }));
}

async function handleMicrosoftLogin() {
  authError().textContent = "";
  const btn = document.getElementById("btn-microsoft-login");
  if (btn) btn.disabled = true;

  try {
    const idToken = await MicrosoftAuth.loginWithMicrosoftPopup();
    const data = await AuthAPI.loginWithMicrosoft(idToken);
    await completeLogin(data);
  } catch (err) {
    authError().textContent = err.message || "No se pudo iniciar sesión con Microsoft.";
  } finally {
    if (btn) btn.disabled = false;
  }
}

function renderAuthBar() {
  const bar = authBar();
  if (!bar) return;

  if (currentUser) {
    const adminLink = currentUser.isAdmin
      ? `<button type="button" class="btn btn--ghost" id="btn-go-admin">Administración</button>`
      : "";
    bar.innerHTML = `
      <span class="auth-bar__user">Hola, <strong>${escapeHtml(currentUser.displayName)}</strong>${currentUser.isAdmin ? ' <span class="admin-tag">Admin</span>' : ""}</span>
      <span class="auth-bar__hint">${currentUser.isAdmin ? "Panel de administración disponible" : "Podés guardar pronósticos en el fixture"}</span>
      ${adminLink}
      <button type="button" class="btn btn--ghost" id="btn-logout">Cerrar sesión</button>
    `;
    document.getElementById("btn-logout")?.addEventListener("click", logout);
    document.getElementById("btn-go-admin")?.addEventListener("click", () => {
      document.getElementById("tab-admin")?.click();
    });
  } else {
    bar.innerHTML = `
      <span class="auth-bar__hint">Iniciá sesión para guardar tus pronósticos</span>
      <button type="button" class="btn btn--primary" id="btn-open-login">Iniciar sesión</button>
      <button type="button" class="btn btn--ghost" id="btn-open-register">Registrarse</button>
    `;
    document.getElementById("btn-open-login")?.addEventListener("click", () => openAuthModal("login"));
    document.getElementById("btn-open-register")?.addEventListener("click", () => openAuthModal("register"));
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function openAuthModal(mode) {
  authMode = mode;
  const modal = authModal();
  if (!modal) return;

  authTitle().textContent = mode === "login" ? "Iniciar sesión" : "Crear cuenta";
  nameField().hidden = mode === "login";
  document.getElementById("auth-display-name").required = mode === "register";
  document.getElementById("auth-switch").textContent =
    mode === "login" ? "¿No tenés cuenta? Registrate" : "¿Ya tenés cuenta? Iniciá sesión";
  authError().textContent = "";
  authForm().reset();
  updateMicrosoftVisibility();
  modal.hidden = false;
  document.getElementById("auth-email")?.focus();
}

function closeAuthModal() {
  const modal = authModal();
  if (modal) modal.hidden = true;
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  authError().textContent = "";

  const email = document.getElementById("auth-email").value;
  const password = document.getElementById("auth-password").value;
  const displayName = document.getElementById("auth-display-name").value;

  try {
    const data =
      authMode === "login"
        ? await AuthAPI.login(email, password)
        : await AuthAPI.register(email, password, displayName);

    await completeLogin(data);
  } catch (err) {
    authError().textContent = err.message;
  }
}

function logout() {
  AuthAPI.setToken(null);
  currentUser = null;
  predictionsCache = {};
  renderAuthBar();
  window.dispatchEvent(new CustomEvent("auth:change", { detail: { user: null } }));
}

async function loadPredictions() {
  if (!currentUser) {
    predictionsCache = {};
    return;
  }
  try {
    const data = await AuthAPI.getPredictions();
    predictionsCache = data.predictions || {};
  } catch {
    predictionsCache = {};
  }
}

async function initAuth() {
  document.getElementById("auth-modal-close")?.addEventListener("click", closeAuthModal);
  document.getElementById("auth-modal-backdrop")?.addEventListener("click", closeAuthModal);
  authForm()?.addEventListener("submit", handleAuthSubmit);
  document.getElementById("btn-microsoft-login")?.addEventListener("click", handleMicrosoftLogin);

  document.getElementById("auth-switch")?.addEventListener("click", (e) => {
    e.preventDefault();
    openAuthModal(authMode === "login" ? "register" : "login");
  });

  const redirectIdToken = await MicrosoftAuth.initMicrosoftAuth();
  updateMicrosoftVisibility();

  if (redirectIdToken) {
    try {
      const data = await AuthAPI.loginWithMicrosoft(redirectIdToken);
      await completeLogin(data);
    } catch (err) {
      authError().textContent = err.message;
      openAuthModal("login");
    }
  }

  const token = AuthAPI.getToken();
  if (token) {
    try {
      const data = await AuthAPI.me();
      currentUser = data.user;
      await loadPredictions();
    } catch {
      AuthAPI.setToken(null);
    }
  }

  renderAuthBar();
  if (typeof updateAdminTabVisibility === "function") updateAdminTabVisibility();
}

async function refreshCurrentUser() {
  if (!AuthAPI.getToken()) {
    currentUser = null;
    return null;
  }
  try {
    const data = await AuthAPI.me();
    currentUser = data.user;
    renderAuthBar();
    if (typeof updateAdminTabVisibility === "function") updateAdminTabVisibility();
    return currentUser;
  } catch {
    AuthAPI.setToken(null);
    currentUser = null;
    renderAuthBar();
    if (typeof updateAdminTabVisibility === "function") updateAdminTabVisibility();
    return null;
  }
}

window.AuthState = {
  getUser: () => currentUser,
  isLoggedIn: () => !!currentUser,
  isAdmin: () => !!currentUser?.isAdmin,
  refreshUser: refreshCurrentUser,
  getPredictions: () => predictionsCache,
  setPrediction(matchId, homeScore, awayScore) {
    predictionsCache[matchId] = { homeScore, awayScore };
  },
  removePrediction(matchId) {
    delete predictionsCache[matchId];
  },
  async savePrediction(matchId, homeScore, awayScore) {
    await AuthAPI.savePrediction(matchId, homeScore, awayScore);
    predictionsCache[matchId] = { homeScore, awayScore };
  },
  reloadPredictions: loadPredictions,
};

initAuth();
