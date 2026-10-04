/* =========================================
   OV APP — SESIÓN Y EMPRESA ACTIVA
   USUARIO → EMPRESA → RLS
========================================= */

async function checkSupabaseConnection() {

  /*
    1. Verificar cliente Supabase
  */

  if (
    typeof ovSupabase === "undefined" ||
    !ovSupabase
  ) {

    console.error(
      "OV: Supabase no está disponible."
    );

    showToast(
      "No se pudo conectar con OV"
    );

    return;
  }


  try {

    /*
      2. Obtener sesión actual
    */

    const {
      data: sessionData,
      error: sessionError
    } =
      await ovSupabase.auth.getSession();


    if (sessionError) {
      throw sessionError;
    }


    const session =
      sessionData?.session;


    /*
      3. Sin sesión
    */

    if (!session) {

      console.info(
        "OV: sin sesión activa."
      );

      return;
    }


    /*
      4. Obtener empresas disponibles
      según permisos RLS
    */

    const {
      data: companies,
      error: companiesError
    } =
      await ovSupabase
        .from("companies")
        .select("id, name");


    if (companiesError) {
      throw companiesError;
    }


    /*
      5. Sin empresa asignada
    */

    if (
      !companies ||
      companies.length === 0
    ) {

      showToast(
        "Sesión activa · Sin empresa"
      );

      return;
    }


    /*
      6. Empresa activa

      Por ahora usamos la primera empresa
      disponible para el usuario.

      Más adelante OV permitirá cambiar
      entre varias empresas.
    */

    const activeCompany =
      companies[0];


    /*
      Guardamos temporalmente la empresa
      obtenida desde Supabase para que
      otros módulos de OV puedan utilizarla.
    */

    window.OV_SESSION = {
      user: session.user,
      company: activeCompany
    };
     
/*
  MIGRACIÓN LOCAL → SUPABASE
  Ejecutar únicamente si la función existe.
*/


/*
  7. Sincronizar empresa de Supabase
  con la interfaz de OV

  Por ahora SOLO actualizamos
  el nombre visible.

  No modificamos movimientos,
  clientes ni proyectos.
*/

const companyTitle =
  document.getElementById(
    "companyTitle"
  );

const moreCompanyName =
  document.getElementById(
    "moreCompanyName"
  );

const movementCompanyText =
  document.getElementById(
    "movementCompanyText"
  );

const addCompanyText =
  document.getElementById(
    "addCompanyText"
  );

const aiCompanyText =
  document.getElementById(
    "aiCompanyText"
  );


if (companyTitle) {
  companyTitle.textContent =
    activeCompany.name;
}

if (moreCompanyName) {
  moreCompanyName.textContent =
    activeCompany.name;
}

if (movementCompanyText) {
  movementCompanyText.textContent =
    activeCompany.name;
}

if (addCompanyText) {
  addCompanyText.textContent =
    activeCompany.name;
}

if (aiCompanyText) {
  aiCompanyText.textContent =
    activeCompany.name;
}
    /*
      7. Resultado técnico
      Solo visible en consola
    */

    console.info(
      "OV — SESIÓN ACTIVA",
      {
        userId: session.user.id,
        company: activeCompany
      }
    );
if (
  typeof loadTransactionsFromSupabase === "function"
) {
  await loadTransactionsFromSupabase();
}

    /*
      8. Mensaje visible
    */

    showToast(
      "● Sesión activa · " +
      activeCompany.name,
      "success"
    );


  } catch (error) {

    console.error(
      "OV: error de sesión/empresa",
      error
    );


    showToast(
      "No se pudo cargar la empresa"
    );
  }
}


/* =========================================
   EJECUTAR SESIÓN
========================================= */

checkSupabaseConnection();
