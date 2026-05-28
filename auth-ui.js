let currentUser = null;
let predictionsCache = {};

const authBar = () => document.getElementById("auth-bar");
const authModal = () => document.getElementById("auth-modal");
const authForm = () => document.getElementById("auth-form");
const authTitle = () => document.getElementById("auth-modal-title");
const authError = () => document.getElementById("auth-error");
const nameField = () => document.getElementById("auth-name-field");

let authMode = "login";

function renderAuthBar() {
  const bar = authBar();
  if (!bar) return;

  if (currentUser) {
    bar.innerHTML = `
      <span class="auth-bar__user">Hola, <strong>${escapeHtml(currentUser.displayName)}</strong></span>
      <span class="auth-bar__hint">Podés guardar pronósticos en el fixture</span>
      <button type="button" class="btn btn--ghost" id="btn-logout">Cerrar sesión</button>
    `;
    document.getElementById("btn-logout")?.addEventListener("click", logout);
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

    AuthAPI.setToken(data.token);
    currentUser = data.user;
    closeAuthModal();
    await loadPredictions();
    renderAuthBar();
    window.dispatchEvent(new CustomEvent("auth:change", { detail: { user: currentUser } }));
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

  document.getElementById("auth-switch")?.addEventListener("click", (e) => {
    e.preventDefault();
    openAuthModal(authMode === "login" ? "register" : "login");
  });

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
}

window.AuthState = {
  getUser: () => currentUser,
  isLoggedIn: () => !!currentUser,
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
