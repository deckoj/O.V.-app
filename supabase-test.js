/* =========================================
   OV APP — PRUEBA DE SUPABASE
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
      "Error: Supabase no cargó"
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
      3. Si todavía no hay sesión
    */

    if (!session) {

      console.info(
        "OV: Supabase conectado, sin sesión."
      );

      showToast(
        "Supabase conectado · falta iniciar sesión"
      );

      return;
    }


    /*
      4. Consultar empresas visibles
      para el usuario autenticado.

      RLS debe decidir cuáles puede ver.
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
      5. Resultado técnico
    */

    console.info(
      "OV SUPABASE — USUARIO → EMPRESA",
      {
        authenticated: true,
        userId: session.user.id,
        companies: companies
      }
    );


    /*
      6. Resultado visible
    */

    if (
      companies &&
      companies.length > 0
    ) {

      const companyNames =
        companies
          .map(company => company.name)
          .join(", ");


      showToast(
        "Supabase conectado · " +
        companyNames
      );

    } else {

      showToast(
        "Conectado · sin empresas asignadas"
      );
    }


  } catch (error) {

    console.error(
      "OV: error Usuario → Empresa",
      error
    );


    showToast(
      "Error al consultar empresas"
    );
  }
}


/* =========================================
   EJECUTAR PRUEBA
========================================= */

checkSupabaseConnection();
