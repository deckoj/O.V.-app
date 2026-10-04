/* =========================================
   OV APP — PRUEBA DE SUPABASE
   SOLO CONEXIÓN Y SESIÓN
========================================= */

async function checkSupabaseConnection() {

  if (
    typeof ovSupabase === "undefined" ||
    !ovSupabase
  ) {

    console.error(
      "OV: el cliente de Supabase no está cargado."
    );

    showToast(
      "Error: Supabase no cargó"
    );

    return;
  }


  try {

    const {
      data,
      error
    } =
      await ovSupabase.auth.getSession();


    if (error) {

      console.error(
        "OV: error de Supabase Auth",
        error
      );

      showToast(
        "Error de conexión Supabase"
      );

      return;
    }


    const hasSession =
      Boolean(
        data?.session
      );


    console.info(
      "OV SUPABASE OK",
      {
        connected: true,
        authenticated: hasSession
      }
    );


    if (hasSession) {

      showToast(
        "Supabase conectado"
      );

    } else {

      showToast(
        "Supabase conectado · falta iniciar sesión"
      );
    }


  } catch (error) {

    console.error(
      "OV: error inesperado",
      error
    );

    showToast(
      "Error de conexión Supabase"
    );
  }
}


/* =========================================
   EJECUTAR PRUEBA
========================================= */

checkSupabaseConnection();
