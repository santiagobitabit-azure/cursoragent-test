const TOKEN_KEY = "mundial_token";

const AuthAPI = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  },

  async request(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...options.headers };
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(data.error || "Error de red");
      err.status = res.status;
      throw err;
    }
    return data;
  },

  register(email, password, displayName) {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName }),
    });
  },

  login(email, password) {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  me() {
    return this.request("/api/auth/me");
  },

  getPredictions() {
    return this.request("/api/predictions");
  },

  savePrediction(matchId, homeScore, awayScore) {
    return this.request(`/api/predictions/${matchId}`, {
      method: "PUT",
      body: JSON.stringify({ homeScore, awayScore }),
    });
  },

  deletePrediction(matchId) {
    return fetch(`/api/predictions/${matchId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${this.getToken()}` },
    });
  },
};

window.AuthAPI = AuthAPI;
