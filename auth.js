/* =========================================
   OV APP — AUTENTICACIÓN
   Supabase Auth
========================================= */

async function ovLogin(email, password) {

  const cleanEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  const cleanPassword =
    String(password || "");


  if (!cleanEmail) {

    return {
      success: false,
      message: "Escribe tu correo electrónico."
    };
  }


  if (!cleanPassword) {

    return {
      success: false,
      message: "Escribe tu contraseña."
    };
  }


  if (
    typeof ovSupabase === "undefined" ||
    !ovSupabase
  ) {

    return {
      success: false,
      message: "Supabase no está disponible."
    };
  }


  try {

    const {
      data,
      error
    } =
      await ovSupabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      });


    if (error) {

      console.error(
        "OV Auth:",
        error
      );

      return {
        success: false,
        message:
          "No pudimos iniciar sesión. Revisa tu correo y contraseña."
      };
    }


    if (!data?.session) {

      return {
        success: false,
        message:
          "No se pudo crear la sesión."
      };
    }


    console.info(
      "OV: sesión iniciada correctamente."
    );


    return {
      success: true,
      session: data.session,
      user: data.user
    };


  } catch (error) {

    console.error(
      "OV Auth error:",
      error
    );

    return {
      success: false,
      message:
        "Ocurrió un error al iniciar sesión."
    };
  }
}


/* =========================================
   CERRAR SESIÓN
========================================= */

async function ovLogout() {

  if (
    typeof ovSupabase === "undefined" ||
    !ovSupabase
  ) {
    return false;
  }


  try {

    const {
      error
    } =
      await ovSupabase.auth.signOut();


    if (error) {

      console.error(
        "OV Logout:",
        error
      );

      return false;
    }


    console.info(
      "OV: sesión cerrada."
    );

    return true;


  } catch (error) {

    console.error(
      "OV Logout error:",
      error
    );

    return false;
  }
}


/* =========================================
   OBTENER SESIÓN ACTUAL
========================================= */

async function ovGetSession() {

  if (
    typeof ovSupabase === "undefined" ||
    !ovSupabase
  ) {
    return null;
  }


  try {

    const {
      data,
      error
    } =
      await ovSupabase.auth.getSession();


    if (error) {

      console.error(
        "OV Session:",
        error
      );

      return null;
    }


    return (
      data?.session ||
      null
    );


  } catch (error) {

    console.error(
      "OV Session error:",
      error
    );

    return null;
  }
}


/* =========================================
   ESCUCHAR CAMBIOS DE SESIÓN
========================================= */

function ovWatchAuth() {

  if (
    typeof ovSupabase === "undefined" ||
    !ovSupabase
  ) {
    return;
  }


  ovSupabase.auth.onAuthStateChange(
    (
      event,
      session
    ) => {

      console.info(
        "OV Auth:",
        event
      );


      window.dispatchEvent(
        new CustomEvent(
          "ov-auth-change",
          {
            detail: {
              event,
              session
            }
          }
        )
      );

    }
  );
}


/* =========================================
   INICIAR ESCUCHA
========================================= */

ovWatchAuth();
/* =========================================
   OV APP — INTERFAZ DE INICIO DE SESIÓN
========================================= */

async function handleOVLogin() {

  const emailInput =
    document.getElementById("loginEmail");

  const passwordInput =
    document.getElementById("loginPassword");

  const message =
    document.getElementById("loginMessage");


  const email =
    emailInput?.value || "";

  const password =
    passwordInput?.value || "";


  if (message) {
    message.textContent =
      "Iniciando sesión...";
  }


  const result =
    await ovLogin(
      email,
      password
    );


  if (!result.success) {

    if (message) {
      message.textContent =
        result.message;
    }

    return;
  }


  if (message) {
    message.textContent =
      "Sesión iniciada correctamente.";
  }


  showOVApp();
}


/* =========================================
   MOSTRAR OV APP
========================================= */

function showOVApp() {

  const loginScreen =
    document.getElementById(
      "loginScreen"
    );


  if (loginScreen) {
    loginScreen.style.display =
      "none";
  }
}


/* =========================================
   MOSTRAR LOGIN
========================================= */

function showOVLogin() {

  const loginScreen =
    document.getElementById(
      "loginScreen"
    );


  if (loginScreen) {
    loginScreen.style.display =
      "flex";
  }
}


/* =========================================
   REVISAR SESIÓN AL ABRIR OV
========================================= */

async function initializeOVAuth() {

  const session =
    await ovGetSession();


  if (session) {

    showOVApp();

  } else {

    showOVLogin();
  }
}


/* =========================================
   CAMBIOS DE AUTENTICACIÓN
========================================= */

window.addEventListener(
  "ov-auth-change",
  event => {

    const session =
      event.detail?.session;


    if (session) {

      showOVApp();

    } else {

      showOVLogin();
    }
  }
);


/* =========================================
   ENTER PARA INICIAR SESIÓN
========================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter" &&
      document.getElementById(
        "loginScreen"
      )?.style.display !== "none"
    ) {

      handleOVLogin();
    }
  }
);


/* =========================================
   INICIAR AUTENTICACIÓN
========================================= */

initializeOVAuth();
