let msalInstance = null;
let microsoftEnabled = false;

async function initMicrosoftAuth() {
  try {
    const config = await AuthAPI.getAuthConfig();
    if (!config.microsoft?.clientId || typeof msal === "undefined") {
      microsoftEnabled = false;
      return null;
    }

    msalInstance = new msal.PublicClientApplication({
      auth: {
        clientId: config.microsoft.clientId,
        authority: config.microsoft.authority,
        redirectUri: window.location.origin,
        navigateToLoginRequestUrl: false,
      },
      cache: {
        cacheLocation: "sessionStorage",
      },
    });

    await msalInstance.initialize();
    microsoftEnabled = true;

    const redirectResult = await msalInstance.handleRedirectPromise();
    if (redirectResult?.idToken) {
      return redirectResult.idToken;
    }
    return null;
  } catch {
    microsoftEnabled = false;
    return null;
  }
}

async function loginWithMicrosoftPopup() {
  if (!msalInstance) {
    throw new Error("Inicio de sesión con Microsoft no disponible.");
  }

  const response = await msalInstance.loginPopup({
    scopes: ["openid", "profile", "email"],
  });

  if (!response?.idToken) {
    throw new Error("No se recibió el token de Microsoft.");
  }

  return response.idToken;
}

window.MicrosoftAuth = {
  initMicrosoftAuth,
  loginWithMicrosoftPopup,
  isEnabled: () => microsoftEnabled,
};
