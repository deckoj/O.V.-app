/* =========================================
   OV APP — PRUEBA DE SUPABASE
   SOLO LECTURA
========================================= */

async function checkSupabaseConnection() {

  /*
    1. Verificar que Supabase
    esté cargado correctamente
  */

  if (
    typeof ovSupabase === "undefined" ||
    !ovSupabase
  ) {

    console.error(
      "OV: Supabase no está disponible."
    );

    if (
      typeof showToast === "function"
    ) {
      showToast(
        "Supabase: revisar configuración"
      );
    }

    return;
  }


  try {

    /*
      2. Comprobar si OV app
      tiene una sesión iniciada
    */

    const {
      data: sessionData,
      error: sessionError
    } =
      await ovSupabase.auth.getSession();


    if (sessionError) {
      throw sessionError;
    }


    /*
      3. Consulta de SOLO LECTURA.

      No crea, modifica ni elimina datos.

      Si todavía no hemos iniciado sesión
      desde OV app, RLS puede devolver
      cero empresas. Eso es normal.
    */

    const {
      data: companyData,
      error: companyError
    } =
      await ovSupabase
        .from("companies")
        .select("id,name")
        .limit(1);


    if (companyError) {
      throw companyError;
    }


    const hasSession =
      Boolean(
        sessionData?.session
      );


    const visibleCompanies =
      companyData?.length || 0;


    /*
      4. Resultado técnico
    */

    console.info(
      "OV Supabase:",
      {
        connected: true,
        authenticated: hasSession,
        visibleCompanies:
          visibleCompanies
      }
    );


    /*
      5. Resultado visible
    */

    if (
      typeof showToast === "function"
    ) {

      if (hasSession) {

        showToast(
          "Supabase conectado"
        );

      } else {

        showToast(
          "Supabase conectado · falta iniciar sesión"
        );
      }
    }


  } catch (error) {

    console.error(
      "OV: error de conexión con Supabase",
      error
    );


    if (
      typeof showToast === "function"
    ) {

      showToast(
        "Supabase: revisar conexión"
      );
    }
  }
}


/* =========================================
   EJECUTAR PRUEBA
========================================= */

checkSupabaseConnection();
