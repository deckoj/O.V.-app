/* =========================================
   OV — APP.JS
   MVP 0.7
   Empresa → Cliente → Proyecto → Movimiento
========================================= */


/* =========================================
   ESTADO GENERAL
========================================= */

let transactionType = "income";
let editingTransactionId = null;
let selectedTransactionId = null;

const OV_CONFIG = {
  defaultCurrency: "MXN",
  locale: "es-MX"
};


/* =========================================
   EMPRESAS
========================================= */

let companies =
  JSON.parse(localStorage.getItem("ov_companies")) || [
    {
      id: "grupo-decko",
      name: "Grupo Decko",
      currency: "MXN"
    }
  ];

companies = companies.map(company => ({
  ...company,
  currency:
    company.currency ||
    OV_CONFIG.defaultCurrency
}));

let activeCompanyId =
  localStorage.getItem("ov_active_company") ||
  companies[0].id;

if (
  !companies.some(
    company =>
      company.id === activeCompanyId
  )
) {
  activeCompanyId = companies[0].id;
}


/* =========================================
   MOVIMIENTOS / MIGRACIÓN
========================================= */

let oldTransactions =
  JSON.parse(
    localStorage.getItem("ov_transactions")
  ) || [];

let companyTransactions =
  JSON.parse(
    localStorage.getItem(
      "ov_company_transactions"
    )
  );

if (!companyTransactions) {

  companyTransactions = {};

  companyTransactions["grupo-decko"] =
    oldTransactions;
}

companies.forEach(company => {

  if (!companyTransactions[company.id]) {
    companyTransactions[company.id] = [];
  }
});


/* =========================================
   CLIENTES
========================================= */

let companyClients =
  JSON.parse(
    localStorage.getItem("ov_company_clients")
  ) || {};

companies.forEach(company => {

  if (!companyClients[company.id]) {
    companyClients[company.id] = [];
  }
});


/* =========================================
   PROYECTOS
========================================= */

let companyProjects =
  JSON.parse(
    localStorage.getItem(
      "ov_company_projects"
    )
  ) || {};

companies.forEach(company => {

  if (!companyProjects[company.id]) {
    companyProjects[company.id] = [];
  }
});


/* =========================================
   EMPRESA ACTIVA
========================================= */

function getActiveCompany() {

  return (
    companies.find(
      company =>
        company.id === activeCompanyId
    ) ||
    companies[0]
  );
}


function getCurrency() {

  return (
    getActiveCompany()?.currency ||
    OV_CONFIG.defaultCurrency
  );
}


function getTransactions() {

  if (!companyTransactions[activeCompanyId]) {
    companyTransactions[activeCompanyId] = [];
  }

  return companyTransactions[activeCompanyId];
}


function getClients() {

  if (!companyClients[activeCompanyId]) {
    companyClients[activeCompanyId] = [];
  }

  return companyClients[activeCompanyId];
}


function getProjects() {

  if (!companyProjects[activeCompanyId]) {
    companyProjects[activeCompanyId] = [];
  }

  return companyProjects[activeCompanyId];
} 
async function loadClientsFromSupabase() {

  if (
    !window.OV_SESSION ||
    !window.OV_SESSION.company
  ) {

    console.warn(
      "OV Supabase: sesión no disponible para cargar clientes."
    );

    return false;
  }


  const companyId =
    window.OV_SESSION.company.id;


  try {

    const {
      data,
      error
    } =
      await ovSupabase
        .from("clients")
        .select(`
          id,
          name,
          created_at
        `)
        .eq(
          "company_id",
          companyId
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        );


    if (error) {
      throw error;
    }


    const remoteClients =
      (data || []).map(
        client => ({

          id:
            client.id,

          supabaseId:
            client.id,

          name:
            client.name,

          createdAt:
            client.created_at
              ? new Date(
                  client.created_at
                ).getTime()
              : Date.now()
        })
      );


    companyClients[
      activeCompanyId
    ] =
      remoteClients;


    saveData();

    renderClientList();
    renderClientSelector();


    console.info(
      "OV Supabase: clientes cargados.",
      remoteClients.length
    );


    return true;


  } catch (error) {

    console.error(
      "OV Supabase: error al cargar clientes:",
      error
    );

    return false;
  }
}
async function loadProjectsFromSupabase() {

  if (
    !window.OV_SESSION ||
    !window.OV_SESSION.company
  ) {

    console.warn(
      "OV Supabase: sesión no disponible para cargar proyectos."
    );

    return false;
  }


  const companyId =
    window.OV_SESSION.company.id;


  try {

    const {
      data,
      error
    } =
      await ovSupabase
        .from("projects")
        .select(`
          id,
          name,
          client_id,
          created_at
        `)
        .eq(
          "company_id",
          companyId
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        );


    if (error) {
      throw error;
    }


    const remoteProjects =
      (data || []).map(
        project => {

          const localClient =
            getClients().find(
              client =>
                client.supabaseId ===
                  project.client_id ||
                client.id ===
                  project.client_id
            );


          return {

            id:
              project.id,

            supabaseId:
              project.id,

            clientId:
              localClient
                ? localClient.id
                : "",

            name:
              project.name,

            createdAt:
              project.created_at
                ? new Date(
                    project.created_at
                  ).getTime()
                : Date.now()
          };
        }
      );


    companyProjects[
      activeCompanyId
    ] =
      remoteProjects;


    saveData();

    renderClientList();
    renderProjectSelector();


    console.info(
      "OV Supabase: proyectos cargados.",
      remoteProjects.length
    );


    return true;


  } catch (error) {

    console.error(
      "OV Supabase: error al cargar proyectos:",
      error
    );

    return false;
  }
}
async function loadTransactionsFromSupabase() {

  if (
    !window.OV_SESSION ||
    !window.OV_SESSION.company
  ) {
    console.warn(
      "OV Supabase: sesión no disponible para cargar movimientos."
    );

    return false;
  }

  const companyId =
    window.OV_SESSION.company.id;

  try {

    const {
      data,
      error
    } =
      await ovSupabase
        .from("transactions")
        .select(`
  id,
  legacy_id,
  type,
  amount,
  currency,
  concept,
  category,
  notes,
  transaction_date,
  source,
  classification_status,
  fiscal_status,
  reconciliation_status,
  client_id,
  project_id,
  created_at,
  clients (
    id,
    name
  ),
  projects (
    id,
    name,
    client_id
  )
`)
        .eq(
          "company_id",
          companyId
        )
        .order(
          "transaction_date",
          {
            ascending: false
          }
        );

    if (error) {
      throw error;
    }
const localClients =
  getClients();

const localProjects =
  getProjects();


const clientIdMap =
  new Map();

const projectIdMap =
  new Map();


(data || []).forEach(
  transaction => {

    /*
      CLIENTE:
      UUID Supabase → ID local OV
    */

    if (
      transaction.client_id &&
      transaction.clients
    ) {

      const localClient =
        localClients.find(
          client =>
            client.name
              .trim()
              .toLowerCase() ===
            transaction.clients.name
              .trim()
              .toLowerCase()
        );

      if (localClient) {

        clientIdMap.set(
          transaction.client_id,
          localClient.id
        );
      }
    }


    /*
      PROYECTO:
      UUID Supabase → ID local OV
    */

    if (
      transaction.project_id &&
      transaction.projects
    ) {

      const mappedClientId =
        clientIdMap.get(
          transaction.client_id
        );

      const localProject =
        localProjects.find(
          project =>
            project.name
              .trim()
              .toLowerCase() ===
              transaction.projects.name
                .trim()
                .toLowerCase() &&
            (
              !mappedClientId ||
              project.clientId ===
                mappedClientId
            )
        );

      if (localProject) {

        projectIdMap.set(
          transaction.project_id,
          localProject.id
        );
      }
    }
  }
);
    const remoteTransactions =
      (data || []).map(
        transaction => ({

          id:
            transaction.legacy_id ||
            transaction.id,

          supabaseId:
            transaction.id,

          type:
            transaction.type,

          amount:
            Number(
              transaction.amount
            ),

          currency:
            transaction.currency ||
            "MXN",

          concept:
            transaction.concept,

          category:
            transaction.category ||
            "",

          notes:
            transaction.notes ||
            "",

          date:
            transaction.transaction_date,

          source:
            transaction.source ||
            "manual",

          classificationStatus:
            transaction.classification_status ||
            "unclassified",

          fiscalStatus:
            transaction.fiscal_status ||
            "pending",

          reconciliationStatus:
            transaction.reconciliation_status ||
            "pending",

          clientId:
  clientIdMap.get(
    transaction.client_id
  ) || "",

projectId:
  projectIdMap.get(
    transaction.project_id
  ) || "",

          createdAt:
            transaction.created_at
              ? new Date(
                  transaction.created_at
                ).getTime()
              : Date.now()
        })
      );

    companyTransactions[
      activeCompanyId
    ] =
      remoteTransactions;

    saveData();

    console.info(
      "OV Supabase: movimientos cargados.",
      remoteTransactions.length
    );

    updateCompanyUI();
    calculate();

    return true;

  } catch (error) {

    console.error(
      "OV Supabase: error al cargar movimientos:",
      error
    );

    return false;
  }
}

function getClientById(id) {

  if (!id) return null;

  return (
    getClients().find(
      client => client.id === id
    ) || null
  );
}


function getProjectById(id) {

  if (!id) return null;

  return (
    getProjects().find(
      project => project.id === id
    ) || null
  );
}


/* =========================================
   DINERO
========================================= */

function money(
  number,
  currency = getCurrency()
) {

  const value =
    Number(number) || 0;

  const formatted =
    new Intl.NumberFormat(
      OV_CONFIG.locale,
      {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    ).format(value);

  return `${formatted} ${currency}`;
}


/* =========================================
   CAMPO MONTO
========================================= */

function cleanAmount(value) {

  if (!value) return "";

  return String(value)
    .replace(/MXN/gi, "")
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .replace(/[^\d.]/g, "");
}


function getAmountValue() {

  const input =
    document.getElementById("amount");

  if (!input) return 0;

  return (
    Number(
      cleanAmount(input.value)
    ) || 0
  );
}


function formatAmountInput(value) {

  let clean =
    cleanAmount(value);

  if (!clean) return "";

  const firstDot =
    clean.indexOf(".");

  if (firstDot !== -1) {

    clean =
      clean.substring(
        0,
        firstDot + 1
      ) +
      clean
        .substring(firstDot + 1)
        .replace(/\./g, "");
  }

  let [integerPart, decimalPart] =
    clean.split(".");

  integerPart =
    integerPart.replace(
      /^0+(?=\d)/,
      ""
    );

  if (!integerPart) {
    integerPart = "0";
  }

  const formattedInteger =
    Number(integerPart)
      .toLocaleString("en-US");

  if (clean.includes(".")) {

    decimalPart =
      (decimalPart || "")
        .slice(0, 2);

    return (
      `${formattedInteger}.` +
      `${decimalPart}`
    );
  }

  return formattedInteger;
}


function setupAmountInput() {

  const input =
    document.getElementById("amount");

  if (!input) return;

  input.type = "text";
  input.inputMode = "decimal";
  input.autocomplete = "off";


  input.addEventListener(
    "input",
    () => {

      input.value =
        formatAmountInput(
          input.value
        );

      const end =
        input.value.length;

      try {
        input.setSelectionRange(
          end,
          end
        );
      } catch (error) {}
    }
  );


  input.addEventListener(
    "blur",
    () => {

      const value =
        getAmountValue();

      if (!value) {
        input.value = "";
        return;
      }

      input.value =
        money(value);
    }
  );


  input.addEventListener(
    "focus",
    () => {

      const value =
        getAmountValue();

      if (!value) {
        input.value = "";
        return;
      }

      let editable =
        value.toFixed(2);

      if (
        editable.endsWith(".00")
      ) {
        editable =
          editable.slice(0, -3);
      }

      input.value =
        formatAmountInput(
          editable
        );

      setTimeout(() => {

        const end =
          input.value.length;

        try {
          input.setSelectionRange(
            end,
            end
          );
        } catch (error) {}

      }, 0);
    }
  );
}


/* =========================================
   GUARDAR DATOS
========================================= */

function saveData() {

  localStorage.setItem(
    "ov_companies",
    JSON.stringify(companies)
  );

  localStorage.setItem(
    "ov_active_company",
    activeCompanyId
  );

  localStorage.setItem(
    "ov_company_transactions",
    JSON.stringify(
      companyTransactions
    )
  );

  localStorage.setItem(
    "ov_company_clients",
    JSON.stringify(
      companyClients
    )
  );

  localStorage.setItem(
    "ov_company_projects",
    JSON.stringify(
      companyProjects
    )
  );
}


/* =========================================
   SELECTOR EMPRESA
========================================= */

function renderCompanySelector() {

  const select =
    document.getElementById(
      "companySelect"
    );

  if (!select) return;

  select.innerHTML = "";

  companies.forEach(company => {

    const option =
      document.createElement(
        "option"
      );

    option.value =
      company.id;

    option.textContent =
      company.name;

    option.selected =
      company.id ===
      activeCompanyId;

    select.appendChild(option);
  });
}


function changeCompany() {

  const select =
    document.getElementById(
      "companySelect"
    );

  if (!select) return;

  activeCompanyId =
    select.value;

  editingTransactionId = null;
  selectedTransactionId = null;

  clearMovementForm();
  setType("income");

  saveData();

  renderCompanySelector();
  updateCompanyUI();
  renderClientSelector();
  renderProjectSelector();
  updateMovementFormState();
  calculate();

  showToast(
    "Empresa cambiada"
  );
}


/* =========================================
   CREAR EMPRESA
========================================= */

function createCompany() {

  const name =
    prompt(
      "¿Cómo se llama la nueva empresa?"
    );

  if (!name) return;

  const cleanName =
    name.trim();

  if (!cleanName) return;

  const alreadyExists =
    companies.some(
      company =>
        company.name
          .toLowerCase() ===
        cleanName
          .toLowerCase()
    );

  if (alreadyExists) {

    alert(
      "Ya existe una empresa con ese nombre."
    );

    return;
  }

  const id =
    createId("company");

  companies.push({
    id,
    name: cleanName,
    currency: "MXN"
  });

  companyTransactions[id] = [];
  companyClients[id] = [];
  companyProjects[id] = [];

  activeCompanyId = id;

  saveData();

  renderCompanySelector();
  updateCompanyUI();
  renderClientSelector();
  renderProjectSelector();
  calculate();

  showToast(
    "Empresa creada"
  );
}


/* =========================================
   ELIMINAR EMPRESA
========================================= */

function deleteCompany(id) {

  if (companies.length === 1) {

    alert(
      "OV debe tener al menos una empresa."
    );

    return;
  }

  const company =
    companies.find(
      item => item.id === id
    );

  if (!company) return;

  const confirmed =
    confirm(
      `¿Eliminar "${company.name}"?\n\n` +
      `También se eliminarán sus movimientos, ` +
      `clientes y proyectos guardados en este dispositivo.`
    );

  if (!confirmed) return;

  companies =
    companies.filter(
      item => item.id !== id
    );

  delete companyTransactions[id];
  delete companyClients[id];
  delete companyProjects[id];

  if (
    activeCompanyId === id
  ) {
    activeCompanyId =
      companies[0].id;
  }

  editingTransactionId = null;
  selectedTransactionId = null;

  saveData();

  renderCompanySelector();
  updateCompanyUI();
  renderClientSelector();
  renderProjectSelector();
  calculate();

  showToast(
    "Empresa eliminada"
  );
}


/* =========================================
   LISTA EMPRESAS
========================================= */

function renderCompanyList() {

  const container =
    document.getElementById(
      "companyList"
    );

  if (!container) return;

  container.innerHTML = "";

  companies.forEach(company => {

    const transactions =
      companyTransactions[
        company.id
      ] || [];

    const clients =
      companyClients[
        company.id
      ] || [];

    const row =
      document.createElement(
        "div"
      );

    row.className =
      "companyRow";


    const left =
      document.createElement(
        "div"
      );

    const strong =
      document.createElement(
        "strong"
      );

    strong.textContent =
      company.name;

    const small =
      document.createElement(
        "small"
      );

    small.style.display =
      "block";

    small.style.marginTop =
      "4px";

    small.textContent =
      `${transactions.length} movimiento` +
      `${transactions.length === 1 ? "" : "s"} · ` +
      `${clients.length} cliente` +
      `${clients.length === 1 ? "" : "s"} · ` +
      `${company.currency || "MXN"}`;

    left.appendChild(strong);
    left.appendChild(small);


    const right =
      document.createElement(
        "div"
      );

    if (
      company.id ===
      activeCompanyId
    ) {

      const current =
        document.createElement(
          "small"
        );

      current.textContent =
        "Actual";

      right.appendChild(
        current
      );

    } else {

      const button =
        document.createElement(
          "button"
        );

      button.className =
        "deleteButton";

      button.textContent =
        "Eliminar";

      button.onclick =
        () =>
          deleteCompany(
            company.id
          );

      right.appendChild(
        button
      );
    }

    row.appendChild(left);
    row.appendChild(right);

    container.appendChild(row);
  });
}


/* =========================================
   CREAR CLIENTE
========================================= */
async function saveClientToSupabase(
  client
) {

  if (
    !window.OV_SESSION ||
    !window.OV_SESSION.company
  ) {

    console.warn(
      "OV Supabase: sesión no disponible para guardar cliente."
    );

    return false;
  }


  const companyId =
    window.OV_SESSION.company.id;


  try {

    const {
      data: existingClients,
      error: searchError
    } =
      await ovSupabase
        .from("clients")
        .select("id, name")
        .eq(
          "company_id",
          companyId
        )
        .ilike(
          "name",
          client.name
        )
        .limit(1);


    if (searchError) {
      throw searchError;
    }


    if (
      existingClients &&
      existingClients.length > 0
    ) {

      console.info(
        "OV Supabase: cliente ya existe.",
        client.name
      );

      return true;
    }


    const {
      error: insertError
    } =
      await ovSupabase
        .from("clients")
        .insert({
          company_id:
            companyId,

          name:
            client.name
        });


    if (insertError) {
      throw insertError;
    }


    console.info(
      "OV Supabase: cliente guardado.",
      client.name
    );

    return true;


  } catch (error) {

    console.error(
      "OV Supabase: error al guardar cliente:",
      error
    );

    return false;
  }
}
function createClient() {

  const name =
    prompt(
      "Nombre del cliente"
    );

  if (!name) return null;

  const cleanName =
    name.trim();

  if (!cleanName) return null;

  const existing =
    getClients().find(
      client =>
        client.name
          .toLowerCase() ===
        cleanName
          .toLowerCase()
    );

  if (existing) {

    alert(
      "Ya existe un cliente con ese nombre."
    );

    return existing.id;
  }

  const client = {
    id: createId("client"),
    name: cleanName,
    createdAt: Date.now()
  };

  getClients().push(client);
saveClientToSupabase(
  client
);
  saveData();

  renderClientList();
  renderClientSelector();

  showToast(
    "Cliente creado"
  );

  return client.id;
}


/* =========================================
   CLIENTE DESDE MOVIMIENTO
========================================= */

function createClientFromMovement() {

  const clientId =
    createClient();

  if (!clientId) return;

  renderClientSelector();

  const select =
    document.getElementById(
      "client"
    );

  if (select) {
    select.value =
      clientId;
  }

  renderProjectSelector();

  showToast(
    "Cliente seleccionado"
  );
}


/* =========================================
   ELIMINAR CLIENTE
========================================= */
async function deleteClientFromSupabase(
  client
) {

  if (
    !window.OV_SESSION ||
    !window.OV_SESSION.company
  ) {

    console.warn(
      "OV Supabase: sesión no disponible para eliminar cliente."
    );

    return false;
  }


  const companyId =
    window.OV_SESSION.company.id;


  try {

    /*
      Obtener cliente remoto.
    */

    let remoteClientId =
      client.supabaseId ||
      null;


    if (!remoteClientId) {

      const {
        data: remoteClients,
        error: searchError
      } =
        await ovSupabase
          .from("clients")
          .select("id")
          .eq(
            "company_id",
            companyId
          )
          .ilike(
            "name",
            client.name
          )
          .limit(1);


      if (searchError) {
        throw searchError;
      }


      if (
        remoteClients &&
        remoteClients.length > 0
      ) {

        remoteClientId =
          remoteClients[0].id;
      }
    }


    if (!remoteClientId) {

      console.warn(
        "OV Supabase: cliente remoto no encontrado.",
        client.name
      );

      return false;
    }


    /*
      Primero eliminar proyectos
      pertenecientes al cliente.
    */

    const {
      error: projectsError
    } =
      await ovSupabase
        .from("projects")
        .delete()
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "client_id",
          remoteClientId
        );


    if (projectsError) {
      throw projectsError;
    }


    /*
      Después eliminar cliente.
    */

    const {
      error: clientError
    } =
      await ovSupabase
        .from("clients")
        .delete()
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "id",
          remoteClientId
        );


    if (clientError) {
      throw clientError;
    }


    console.info(
      "OV Supabase: cliente eliminado.",
      client.name
    );

    return true;


  } catch (error) {

    console.error(
      "OV Supabase: error al eliminar cliente:",
      error
    );

    return false;
  }
}
function deleteClient(id) {

  const client =
    getClientById(id);

  if (!client) return;

  const clientProjects =
    getProjects().filter(
      project =>
        project.clientId === id
    );

  const relatedTransactions =
    getTransactions().filter(
      transaction =>
        transaction.clientId === id
    );

  if (
    relatedTransactions.length > 0
  ) {

    alert(
      `No puedes eliminar "${client.name}" porque tiene ` +
      `${relatedTransactions.length} movimiento` +
      `${relatedTransactions.length === 1 ? "" : "s"} asociado` +
      `${relatedTransactions.length === 1 ? "" : "s"}.\n\n` +
      `Primero edita esos movimientos y cambia el cliente.`
    );

    return;
  }

  const confirmed =
    confirm(
      `¿Eliminar el cliente "${client.name}"?\n\n` +
      `También se eliminarán ${clientProjects.length} ` +
      `proyecto${clientProjects.length === 1 ? "" : "s"} ` +
      `sin movimientos asociados.`
    );

  if (!confirmed) return;
   
deleteClientFromSupabase(
  client
);
  companyClients[
    activeCompanyId
  ] =
    getClients().filter(
      client =>
        client.id !== id
    );

  companyProjects[
    activeCompanyId
  ] =
    getProjects().filter(
      project =>
        project.clientId !== id
    );

  saveData();

  renderClientList();
  renderClientSelector();
  renderProjectSelector();

  showToast(
    "Cliente eliminado"
  );
}


/* =========================================
   LISTA CLIENTES
========================================= */

function renderClientList() {

  const container =
    document.getElementById(
      "clientList"
    );

  if (!container) return;

  container.innerHTML = "";

  const clients =
    [...getClients()].sort(
      (a, b) =>
        a.name.localeCompare(
          b.name,
          "es"
        )
    );

  if (
    clients.length === 0
  ) {

    container.innerHTML =
      `<div class="empty">` +
      `Aún no hay clientes en esta empresa.` +
      `</div>`;

    return;
  }

  clients.forEach(client => {

    const projects =
      getProjects().filter(
        project =>
          project.clientId ===
          client.id
      );

    const transactions =
      getTransactions().filter(
        transaction =>
          transaction.clientId ===
          client.id
      );

    const row =
      document.createElement(
        "div"
      );

    row.className =
      "clientRow";


    const header =
      document.createElement(
        "div"
      );

    header.className =
      "clientHeader";


    const info =
      document.createElement(
        "div"
      );

    info.className =
      "clientInfo";


    const strong =
      document.createElement(
        "strong"
      );

    strong.textContent =
      client.name;


    const small =
      document.createElement(
        "small"
      );

    small.textContent =
      `${projects.length} proyecto` +
      `${projects.length === 1 ? "" : "s"} · ` +
      `${transactions.length} movimiento` +
      `${transactions.length === 1 ? "" : "s"}`;


    info.appendChild(strong);
    info.appendChild(small);


    const actions =
      document.createElement(
        "div"
      );

    actions.className =
      "clientActions";


    const addProject =
      document.createElement(
        "button"
      );

    addProject.className =
      "smallButton";

    addProject.textContent =
      "+ Proyecto";

    addProject.onclick =
      () =>
        createProject(
          client.id
        );


    const remove =
      document.createElement(
        "button"
      );

    remove.className =
      "deleteButton";

    remove.textContent =
      "Eliminar";

    remove.onclick =
      () =>
        deleteClient(
          client.id
        );


    actions.appendChild(
      addProject
    );

    actions.appendChild(
      remove
    );


    header.appendChild(info);
    header.appendChild(actions);

    row.appendChild(header);


    if (
      projects.length > 0
    ) {

      const projectList =
        document.createElement(
          "div"
        );

      projectList.className =
        "projectList";


      projects
        .sort(
          (a, b) =>
            a.name.localeCompare(
              b.name,
              "es"
            )
        )
        .forEach(project => {

          const projectRow =
            document.createElement(
              "div"
            );

          projectRow.className =
            "projectRow";


          const left =
            document.createElement(
              "div"
            );


          const name =
            document.createElement(
              "div"
            );

          name.className =
            "projectName";

          name.textContent =
            project.name;


          const count =
            getTransactions()
              .filter(
                transaction =>
                  transaction.projectId ===
                  project.id
              )
              .length;


          const meta =
            document.createElement(
              "div"
            );

          meta.className =
            "projectMeta";

          meta.textContent =
            `${count} movimiento` +
            `${count === 1 ? "" : "s"}`;


          left.appendChild(name);
          left.appendChild(meta);


          const deleteButton =
            document.createElement(
              "button"
            );

          deleteButton.className =
            "projectDelete";

          deleteButton.textContent =
            "Eliminar";

          deleteButton.onclick =
            () =>
              deleteProject(
                project.id
              );


          projectRow.appendChild(
            left
          );

          projectRow.appendChild(
            deleteButton
          );

          projectList.appendChild(
            projectRow
          );
        });


      row.appendChild(
        projectList
      );
    }

    container.appendChild(row);
  });
}


/* =========================================
   SELECTOR CLIENTE
========================================= */

function renderClientSelector(
  selectedClientId = null
) {

  const select =
    document.getElementById(
      "client"
    );

  if (!select) return;

  const currentValue =
    selectedClientId !== null
      ? selectedClientId
      : select.value;

  select.innerHTML = "";

  const emptyOption =
    document.createElement(
      "option"
    );

  emptyOption.value = "";
  emptyOption.textContent =
    "Sin cliente";

  select.appendChild(
    emptyOption
  );


  const clients =
    [...getClients()].sort(
      (a, b) =>
        a.name.localeCompare(
          b.name,
          "es"
        )
    );

  clients.forEach(client => {

    const option =
      document.createElement(
        "option"
      );

    option.value =
      client.id;

    option.textContent =
      client.name;

    select.appendChild(
      option
    );
  });


  if (
    currentValue &&
    clients.some(
      client =>
        client.id ===
        currentValue
    )
  ) {

    select.value =
      currentValue;

  } else {

    select.value = "";
  }
}


/* =========================================
   CAMBIO CLIENTE MOVIMIENTO
========================================= */

function changeMovementClient() {

  renderProjectSelector();
}


/* =========================================
   CREAR PROYECTO
========================================= */
async function saveProjectToSupabase(
  project
) {

  if (
    !window.OV_SESSION ||
    !window.OV_SESSION.company
  ) {

    console.warn(
      "OV Supabase: sesión no disponible para guardar proyecto."
    );

    return false;
  }


  const companyId =
    window.OV_SESSION.company.id;

  const localClient =
    getClientById(
      project.clientId
    );


  if (!localClient) {

    console.error(
      "OV Supabase: no se encontró el cliente local del proyecto."
    );

    return false;
  }


  try {

    /*
      Buscar el cliente correspondiente
      en Supabase
    */

    const {
      data: remoteClients,
      error: clientError
    } =
      await ovSupabase
        .from("clients")
        .select("id")
        .eq(
          "company_id",
          companyId
        )
        .ilike(
          "name",
          localClient.name
        )
        .limit(1);


    if (clientError) {
      throw clientError;
    }


    if (
      !remoteClients ||
      remoteClients.length === 0
    ) {

      throw new Error(
        "El cliente todavía no existe en Supabase."
      );
    }


    const supabaseClientId =
      remoteClients[0].id;


    /*
      Evitar proyecto duplicado
    */

    const {
      data: existingProjects,
      error: searchError
    } =
      await ovSupabase
        .from("projects")
        .select("id, name")
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "client_id",
          supabaseClientId
        )
        .ilike(
          "name",
          project.name
        )
        .limit(1);


    if (searchError) {
      throw searchError;
    }


    if (
      existingProjects &&
      existingProjects.length > 0
    ) {

      console.info(
        "OV Supabase: proyecto ya existe.",
        project.name
      );

      return true;
    }


    /*
      Crear proyecto
    */

    const {
      error: insertError
    } =
      await ovSupabase
        .from("projects")
        .insert({
          company_id:
            companyId,

          client_id:
            supabaseClientId,

          name:
            project.name
        });


    if (insertError) {
      throw insertError;
    }


    console.info(
      "OV Supabase: proyecto guardado.",
      project.name
    );

    return true;


  } catch (error) {

    console.error(
      "OV Supabase: error al guardar proyecto:",
      error
    );

    return false;
  }
}
function createProject(clientId) {

  const client =
    getClientById(clientId);

  if (!client) {

    alert(
      "Primero selecciona un cliente."
    );

    return null;
  }

  const name =
    prompt(
      `Nuevo proyecto / cuenta para ${client.name}`
    );

  if (!name) return null;

  const cleanName =
    name.trim();

  if (!cleanName) return null;

  const existing =
    getProjects().find(
      project =>
        project.clientId ===
          clientId &&
        project.name
          .toLowerCase() ===
        cleanName
          .toLowerCase()
    );

  if (existing) {

    alert(
      "Ese cliente ya tiene un proyecto con ese nombre."
    );

    return existing.id;
  }

  const project = {
    id: createId("project"),
    clientId,
    name: cleanName,
    createdAt: Date.now()
  };

  getProjects().push(
    project
  );
   
saveProjectToSupabase(
  project
);
  saveData();

  renderClientList();
  renderProjectSelector();

  showToast(
    "Proyecto creado"
  );

  return project.id;
}


/* =========================================
   PROYECTO DESDE MOVIMIENTO
========================================= */

function createProjectFromMovement() {

  const clientSelect =
    document.getElementById(
      "client"
    );

  if (!clientSelect) return;

  const clientId =
    clientSelect.value;

  if (!clientId) {

    alert(
      "Primero selecciona o crea un cliente."
    );

    return;
  }

  const projectId =
    createProject(
      clientId
    );

  if (!projectId) return;

  renderProjectSelector(
    projectId
  );

  showToast(
    "Proyecto seleccionado"
  );
}


/* =========================================
   ELIMINAR PROYECTO
========================================= */
async function deleteProjectFromSupabase(
  project
) {

  if (
    !window.OV_SESSION ||
    !window.OV_SESSION.company
  ) {

    console.warn(
      "OV Supabase: sesión no disponible para eliminar proyecto."
    );

    return false;
  }


  const companyId =
    window.OV_SESSION.company.id;


  try {

    let remoteProjectId =
      project.supabaseId ||
      null;


    /*
      Si todavía no tenemos el UUID
      de Supabase, buscar el proyecto.
    */

    if (!remoteProjectId) {

      const localClient =
        getClientById(
          project.clientId
        );

      if (!localClient) {

        console.warn(
          "OV Supabase: cliente del proyecto no encontrado."
        );

        return false;
      }


      let remoteClientId =
        localClient.supabaseId ||
        null;


      if (!remoteClientId) {

        const {
          data: remoteClients,
          error: clientError
        } =
          await ovSupabase
            .from("clients")
            .select("id")
            .eq(
              "company_id",
              companyId
            )
            .ilike(
              "name",
              localClient.name
            )
            .limit(1);


        if (clientError) {
          throw clientError;
        }


        if (
          remoteClients &&
          remoteClients.length > 0
        ) {

          remoteClientId =
            remoteClients[0].id;
        }
      }


      if (!remoteClientId) {

        console.warn(
          "OV Supabase: cliente remoto no encontrado."
        );

        return false;
      }


      const {
        data: remoteProjects,
        error: projectSearchError
      } =
        await ovSupabase
          .from("projects")
          .select("id")
          .eq(
            "company_id",
            companyId
          )
          .eq(
            "client_id",
            remoteClientId
          )
          .ilike(
            "name",
            project.name
          )
          .limit(1);


      if (projectSearchError) {
        throw projectSearchError;
      }


      if (
        remoteProjects &&
        remoteProjects.length > 0
      ) {

        remoteProjectId =
          remoteProjects[0].id;
      }
    }


    if (!remoteProjectId) {

      console.warn(
        "OV Supabase: proyecto remoto no encontrado.",
        project.name
      );

      return false;
    }


    const {
      error
    } =
      await ovSupabase
        .from("projects")
        .delete()
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "id",
          remoteProjectId
        );


    if (error) {
      throw error;
    }


    console.info(
      "OV Supabase: proyecto eliminado.",
      project.name
    );

    return true;


  } catch (error) {

    console.error(
      "OV Supabase: error al eliminar proyecto:",
      error
    );

    return false;
  }
}
function deleteProject(id) {

  const project =
    getProjectById(id);

  if (!project) return;

  const relatedTransactions =
    getTransactions().filter(
      transaction =>
        transaction.projectId === id
    );

  if (
    relatedTransactions.length > 0
  ) {

    alert(
      `No puedes eliminar "${project.name}" porque tiene ` +
      `${relatedTransactions.length} movimiento` +
      `${relatedTransactions.length === 1 ? "" : "s"} asociado` +
      `${relatedTransactions.length === 1 ? "" : "s"}.\n\n` +
      `Primero cambia el proyecto de esos movimientos.`
    );

    return;
  }

  const confirmed =
    confirm(
      `¿Eliminar el proyecto "${project.name}"?`
    );

  if (!confirmed) return;

  companyProjects[
    activeCompanyId
  ] =
    getProjects().filter(
      project =>
        project.id !== id
    );

  saveData();

  renderClientList();
  renderProjectSelector();

  showToast(
    "Proyecto eliminado"
  );
}


/* =========================================
   SELECTOR PROYECTO
========================================= */

function renderProjectSelector(
  selectedProjectId = null
) {

  const clientSelect =
    document.getElementById(
      "client"
    );

  const projectSelect =
    document.getElementById(
      "project"
    );

  const help =
    document.getElementById(
      "projectHelp"
    );

  const newProjectButton =
    document.getElementById(
      "newProjectButton"
    );

  if (
    !clientSelect ||
    !projectSelect
  ) {
    return;
  }

  const clientId =
    clientSelect.value;

  const currentValue =
    selectedProjectId !== null
      ? selectedProjectId
      : projectSelect.value;

  projectSelect.innerHTML = "";

  const emptyOption =
    document.createElement(
      "option"
    );

  emptyOption.value = "";

  emptyOption.textContent =
    clientId
      ? "Sin proyecto"
      : "Selecciona un cliente";

  projectSelect.appendChild(
    emptyOption
  );


  if (!clientId) {

    projectSelect.disabled =
      true;

    if (newProjectButton) {
      newProjectButton.disabled =
        true;

      newProjectButton.style.opacity =
        "0.45";
    }

    if (help) {
      help.textContent =
        "Primero selecciona un cliente para asignar un proyecto.";
    }

    return;
  }


  projectSelect.disabled =
    false;

  if (newProjectButton) {
    newProjectButton.disabled =
      false;

    newProjectButton.style.opacity =
      "1";
  }


  const client =
    getClientById(clientId);

  const projects =
    getProjects()
      .filter(
        project =>
          project.clientId ===
          clientId
      )
      .sort(
        (a, b) =>
          a.name.localeCompare(
            b.name,
            "es"
          )
      );


  projects.forEach(project => {

    const option =
      document.createElement(
        "option"
      );

    option.value =
      project.id;

    option.textContent =
      project.name;

    projectSelect.appendChild(
      option
    );
  });


  if (
    currentValue &&
    projects.some(
      project =>
        project.id ===
        currentValue
    )
  ) {

    projectSelect.value =
      currentValue;

  } else {

    projectSelect.value =
      "";
  }


  if (help) {

    help.textContent =
      projects.length > 0
        ? `Proyectos de ${client?.name || "este cliente"}.`
        : `${client?.name || "Este cliente"} todavía no tiene proyectos.`;
  }
}


/* =========================================
   UI EMPRESA
========================================= */

function updateCompanyUI() {

  const company =
    getActiveCompany();

  if (!company) return;

  setText(
    "companyTitle",
    company.name
  );

  setText(
    "movementCompanyText",
    `Historial de ${company.name}.`
  );

  setText(
    "addCompanyText",
    editingTransactionId
      ? `Editando movimiento de ${company.name} · ${getCurrency()}.`
      : `Registrando movimiento en ${company.name} · ${getCurrency()}.`
  );

  setText(
    "aiCompanyText",
    `Analizando la información registrada de ${company.name}.`
  );

  setText(
    "moreCompanyName",
    `${company.name} · ${getCurrency()}`
  );

  renderCompanyList();
  renderClientList();
}


/* =========================================
   CÁLCULOS
========================================= */

function calculate() {

  const transactions =
    getTransactions();

  let income = 0;
  let expense = 0;

  transactions.forEach(
    transaction => {

      if (
        transaction.type ===
        "income"
      ) {

        income +=
          Number(
            transaction.amount
          );

      } else {

        expense +=
          Number(
            transaction.amount
          );
      }
    }
  );

  const balance =
    income - expense;

  setText(
    "income",
    money(income)
  );

  setText(
    "expense",
    money(expense)
  );

  setText(
    "balance",
    money(balance)
  );

  setText(
    "result",
    money(balance)
  );

  renderTransactions();
}


/* =========================================
   MOVIMIENTOS
========================================= */

function renderTransactions() {

  const transactions =
    getTransactions();

  const sorted =
    [...transactions].sort(
      (a, b) =>
        Number(b.id) -
        Number(a.id)
    );

  const recent =
    document.getElementById(
      "recentTransactions"
    );

  const all =
    document.getElementById(
      "allTransactions"
    );

  if (!recent || !all) return;

  recent.innerHTML = "";
  all.innerHTML = "";

  if (
    sorted.length === 0
  ) {

    const empty =
      `<div class="empty">` +
      `Aún no hay movimientos en esta empresa.` +
      `</div>`;

    recent.innerHTML = empty;
    all.innerHTML = empty;

    return;
  }


  sorted.forEach(
    (transaction, index) => {

      const sign =
        transaction.type ===
        "income"
          ? "+"
          : "-";

      const amountClass =
        transaction.type ===
        "income"
          ? "amountIncome"
          : "amountExpense";


      const client =
        getClientById(
          transaction.clientId
        );

      const project =
        getProjectById(
          transaction.projectId
        );


      const details = [];

      if (client) {
        details.push(
          client.name
        );
      }

      if (project) {
        details.push(
          project.name
        );
      }

      if (
        transaction.category
      ) {
        details.push(
          transaction.category
        );
      }

      if (
        transaction.date
      ) {
        details.push(
          formatDate(
            transaction.date
          )
        );
      }


      const safeConcept =
        escapeHTML(
          transaction.concept ||
          "Movimiento"
        );

      const safeDetails =
        details
          .map(item =>
            escapeHTML(item)
          )
          .join(" · ");


      const html = `
        <div class="transaction">

          <div class="transactionInfo">

            <strong>
              ${safeConcept}
            </strong>

            <small>
              ${safeDetails}
            </small>

          </div>


          <div class="transactionRight">

            <div class="${amountClass}">
              ${sign}${money(transaction.amount)}
            </div>

            <button
              type="button"
              class="transactionMenuButton"
              aria-label="Opciones del movimiento"
              onclick="openTransactionMenu(${Number(transaction.id)})">

              ⋯

            </button>

          </div>

        </div>
      `;


      all.insertAdjacentHTML(
        "beforeend",
        html
      );

      if (index < 3) {

        recent.insertAdjacentHTML(
          "beforeend",
          html
        );
      }
    }
  );
}


/* =========================================
   MENÚ MOVIMIENTO
========================================= */

function openTransactionMenu(id) {

  const transaction =
    getTransactions().find(
      transaction =>
        Number(transaction.id) ===
        Number(id)
    );

  if (!transaction) return;

  selectedTransactionId =
    Number(id);

  setText(
    "menuTransactionConcept",
    transaction.concept ||
    "Movimiento"
  );

  setText(
    "menuTransactionAmount",
    `${
      transaction.type ===
      "income"
        ? "+"
        : "-"
    }${money(transaction.amount)}`
  );

  const overlay =
    document.getElementById(
      "transactionOverlay"
    );

  if (overlay) {
    overlay.classList.remove(
      "hidden"
    );
  }
}


function closeTransactionMenu(
  event = null
) {

  if (
    event &&
    event.target !==
      event.currentTarget
  ) {
    return;
  }

  const overlay =
    document.getElementById(
      "transactionOverlay"
    );

  if (overlay) {
    overlay.classList.add(
      "hidden"
    );
  }

  selectedTransactionId =
    null;
}


/* =========================================
   EDITAR DESDE MENÚ
========================================= */

function editSelectedTransaction() {

  if (
    selectedTransactionId ===
    null
  ) {
    return;
  }

  const id =
    selectedTransactionId;

  closeTransactionMenu();

  editTransaction(id);
}


/* =========================================
   ELIMINAR DESDE MENÚ
========================================= */

function deleteSelectedTransaction() {

  if (
    selectedTransactionId ===
    null
  ) {
    return;
  }

  const id =
    selectedTransactionId;

  closeTransactionMenu();

  deleteTransaction(id);
}


/* =========================================
   EDITAR MOVIMIENTO
========================================= */

function editTransaction(id) {

  const transaction =
    getTransactions().find(
      transaction =>
        Number(transaction.id) ===
        Number(id)
    );

  if (!transaction) return;

  editingTransactionId =
    Number(id);

  setType(
    transaction.type
  );


  const amountInput =
    document.getElementById(
      "amount"
    );

  if (amountInput) {

    amountInput.value =
      money(
        transaction.amount
      );
  }


  setValue(
    "concept",
    transaction.concept || ""
  );

  setValue(
    "category",
    transaction.category ||
    "Otros"
  );

  setValue(
    "date",
    transaction.date ||
    today()
  );

  setValue(
    "notes",
    transaction.notes || ""
  );


  renderClientSelector(
    transaction.clientId || ""
  );


  const clientSelect =
    document.getElementById(
      "client"
    );

  if (clientSelect) {

    clientSelect.value =
      transaction.clientId || "";
  }


  renderProjectSelector(
    transaction.projectId || ""
  );


  const projectSelect =
    document.getElementById(
      "project"
    );

  if (
    projectSelect &&
    transaction.projectId
  ) {

    projectSelect.value =
      transaction.projectId;
  }


  updateMovementFormState();

  updateCompanyUI();


  showPage(
    "add",
    document.querySelectorAll(
      ".navItem"
    )[2]
  );


  showToast(
    "Editando movimiento"
  );
}


/* =========================================
   ELIMINAR MOVIMIENTO
========================================= */
async function deleteTransactionFromSupabase(
  transaction
) {

  if (
    !window.OV_SESSION ||
    !window.OV_SESSION.company
  ) {

    console.warn(
      "OV Supabase: sesión no disponible para eliminar movimiento."
    );

    return false;
  }


  const companyId =
    window.OV_SESSION.company.id;


  try {

    let query =
      ovSupabase
        .from("transactions")
        .delete()
        .eq(
          "company_id",
          companyId
        );


    /*
      Si el movimiento vino de Supabase,
      usamos directamente su UUID.
    */

    if (transaction.supabaseId) {

      query =
        query.eq(
          "id",
          transaction.supabaseId
        );

    } else {

      /*
        Si fue creado localmente,
        buscamos por legacy_id.
      */

      query =
        query.eq(
          "legacy_id",
          transaction.id
        );
    }


    const {
      error
    } =
      await query;


    if (error) {
      throw error;
    }


    console.info(
      "OV Supabase: movimiento eliminado.",
      transaction.concept
    );

    return true;


  } catch (error) {

    console.error(
      "OV Supabase: error al eliminar movimiento:",
      error
    );

    return false;
  }
}
function deleteTransaction(id) {

  const transactions =
    getTransactions();

  const transaction =
  transactions.find(
    transaction =>
      String(transaction.id) ===
      String(id)
  );

  if (!transaction) return;

  const confirmed =
    confirm(
      `¿Eliminar este movimiento?\n\n` +
      `${transaction.concept}\n` +
      `${money(transaction.amount)}\n\n` +
      `Esta acción no se puede deshacer.`
    );

  if (!confirmed) {

    showToast(
      "Eliminación cancelada"
    );

    return;
  }
deleteTransactionFromSupabase(
  transaction
);

  companyTransactions[
    activeCompanyId
  ] =
    transactions.filter(
      transaction =>
        String(transaction.id) !==
String(id)
    );


if (
  String(editingTransactionId) ===
  String(id)
) {

    editingTransactionId =
      null;
  }


  saveData();

  clearMovementForm();
  setType("income");

  updateMovementFormState();
  updateCompanyUI();
  calculate();

  showToast(
    "Movimiento eliminado"
  );
}


/* =========================================
   ABRIR MOVIMIENTO NUEVO
========================================= */

function openNewMovement(button) {

  editingTransactionId =
    null;

  clearMovementForm();

  setType("income");

  renderClientSelector();
  renderProjectSelector();

  updateMovementFormState();
  updateCompanyUI();

  showPage(
    "add",
    button
  );
}


/* =========================================
   CANCELAR EDICIÓN
========================================= */

function cancelEdit() {

  editingTransactionId =
    null;

  clearMovementForm();

  setType("income");

  renderClientSelector();
  renderProjectSelector();

  updateMovementFormState();
  updateCompanyUI();

  showToast(
    "Edición cancelada"
  );

  showPage(
    "movements",
    document.querySelectorAll(
      ".navItem"
    )[1]
  );
}


/* =========================================
   ESTADO FORMULARIO
========================================= */

function updateMovementFormState() {

  const title =
    document.getElementById(
      "movementFormTitle"
    );

  const saveButton =
    document.getElementById(
      "saveMovementButton"
    );

  const cancelButton =
    document.getElementById(
      "cancelEditButton"
    );


  if (
    editingTransactionId
  ) {

    if (title) {
      title.textContent =
        "Editar movimiento";
    }

    if (saveButton) {
      saveButton.textContent =
        "Guardar cambios";
    }

    if (cancelButton) {
      cancelButton.classList.remove(
        "hidden"
      );
    }

  } else {

    if (title) {
      title.textContent =
        "Agregar movimiento";
    }

    if (saveButton) {
      saveButton.textContent =
        "Guardar movimiento";
    }

    if (cancelButton) {
      cancelButton.classList.add(
        "hidden"
      );
    }
  }
}


/* =========================================
   LIMPIAR FORMULARIO
========================================= */

function clearMovementForm() {

  setValue(
    "amount",
    ""
  );

  setValue(
    "concept",
    ""
  );

  setValue(
    "notes",
    ""
  );

  setValue(
    "date",
    today()
  );

  setValue(
    "category",
    "Ventas"
  );

  const client =
    document.getElementById(
      "client"
    );

  if (client) {
    client.value = "";
  }

  const project =
    document.getElementById(
      "project"
    );

  if (project) {
    project.value = "";
  }
}


/* =========================================
   TIPO MOVIMIENTO
========================================= */

function setType(type) {

  transactionType =
    type;

  const incomeButton =
    document.getElementById(
      "incomeBtn"
    );

  const expenseButton =
    document.getElementById(
      "expenseBtn"
    );

  if (incomeButton) {

    incomeButton.classList.toggle(
      "active",
      type === "income"
    );
  }

  if (expenseButton) {

    expenseButton.classList.toggle(
      "active",
      type === "expense"
    );
  }
}


/* =========================================
   GUARDAR / ACTUALIZAR
========================================= */

async function saveTransactionToSupabase(
  transaction
) {

  /*
    Guardado remoto.
    El movimiento local sigue siendo
    la fuente de respaldo por ahora.
  */

  if (
    !window.OV_SESSION ||
    !window.OV_SESSION.user ||
    !window.OV_SESSION.company
  ) {

    console.warn(
      "OV Supabase: sesión no disponible."
    );

    return false;
  }


  const userId =
    window.OV_SESSION.user.id;

  const companyId =
    window.OV_SESSION.company.id;


  try {

    let supabaseClientId =
      null;

    let supabaseProjectId =
      null;


    /*
      CLIENTE
      Convertir ID local → UUID Supabase
    */

    if (transaction.clientId) {

      const localClient =
        getClients().find(
          client =>
            client.id ===
            transaction.clientId
        );


      if (localClient) {

        const {
          data: remoteClients,
          error: clientError
        } =
          await ovSupabase
            .from("clients")
            .select("id")
            .eq(
              "company_id",
              companyId
            )
            .eq(
              "name",
              localClient.name
            )
            .limit(1);


        if (clientError) {
          throw clientError;
        }


        if (
          remoteClients &&
          remoteClients.length > 0
        ) {

          supabaseClientId =
            remoteClients[0].id;
        }
      }
    }


    /*
      PROYECTO
      Convertir ID local → UUID Supabase
    */

    if (transaction.projectId) {

      const localProject =
        getProjects().find(
          project =>
            project.id ===
            transaction.projectId
        );


      if (localProject) {

        let projectQuery =
          ovSupabase
            .from("projects")
            .select(
              "id, client_id"
            )
            .eq(
              "company_id",
              companyId
            )
            .eq(
              "name",
              localProject.name
            );


        if (supabaseClientId) {

          projectQuery =
            projectQuery.eq(
              "client_id",
              supabaseClientId
            );
        }


        const {
          data: remoteProjects,
          error: projectError
        } =
          await projectQuery
            .limit(1);


        if (projectError) {
          throw projectError;
        }


        if (
          remoteProjects &&
          remoteProjects.length > 0
        ) {

          supabaseProjectId =
            remoteProjects[0].id;

          /*
            Si encontramos el proyecto,
            usamos también su cliente.
          */

          if (
            !supabaseClientId &&
            remoteProjects[0].client_id
          ) {

            supabaseClientId =
              remoteProjects[0].client_id;
          }
        }
      }
    }


    /*
      Evitar duplicados
    */

    const {
      data: existing,
      error: existingError
    } =
      await ovSupabase
        .from("transactions")
        .select("id")
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "legacy_id",
          transaction.id
        )
        .limit(1);


    if (existingError) {
      throw existingError;
    }


    if (
      existing &&
      existing.length > 0
    ) {

      console.info(
        "OV Supabase: movimiento ya existe."
      );

      return true;
    }


    /*
      INSERTAR MOVIMIENTO
    */

    const {
      error: insertError
    } =
      await ovSupabase
        .from("transactions")
        .insert({

          company_id:
            companyId,

          client_id:
            supabaseClientId,

          project_id:
            supabaseProjectId,

          created_by:
            userId,

          type:
            transaction.type,

          amount:
            transaction.amount,

          currency:
            transaction.currency ||
            "MXN",

          concept:
            transaction.concept,

          category:
            transaction.category ||
            null,

          notes:
            transaction.notes ||
            null,

          transaction_date:
            transaction.date ||
            today(),

          source:
            transaction.source ||
            "manual",

          classification_status:
            transaction.classificationStatus ||
            "unclassified",

          fiscal_status:
            transaction.fiscalStatus ||
            "pending",

          reconciliation_status:
            transaction.reconciliationStatus ||
            "pending",

          legacy_id:
            transaction.id
        });


    if (insertError) {
      throw insertError;
    }


    console.info(
      "OV Supabase: movimiento guardado.",
      transaction.id
    );

    return true;


  } catch (error) {

    console.error(
      "OV Supabase: error al guardar movimiento:",
      error
    );

    return false;
  }
}
async function updateTransactionInSupabase(
  transaction
) {

  if (
    !window.OV_SESSION ||
    !window.OV_SESSION.company
  ) {
    console.warn(
      "OV Supabase: sesión no disponible para actualizar movimiento."
    );

    return false;
  }


  const companyId =
    window.OV_SESSION.company.id;


  try {

    let supabaseClientId =
      null;

    let supabaseProjectId =
      null;


    /*
      Buscar cliente en Supabase
    */

    if (transaction.clientId) {

      const localClient =
        getClientById(
          transaction.clientId
        );

      if (localClient) {

        const {
          data: remoteClients,
          error: clientError
        } =
          await ovSupabase
            .from("clients")
            .select("id")
            .eq(
              "company_id",
              companyId
            )
            .ilike(
              "name",
              localClient.name
            )
            .limit(1);


        if (clientError) {
          throw clientError;
        }


        if (
          remoteClients &&
          remoteClients.length > 0
        ) {
          supabaseClientId =
            remoteClients[0].id;
        }
      }
    }


    /*
      Buscar proyecto en Supabase
    */

    if (
      transaction.projectId &&
      supabaseClientId
    ) {

      const localProject =
        getProjectById(
          transaction.projectId
        );

      if (localProject) {

        const {
          data: remoteProjects,
          error: projectError
        } =
          await ovSupabase
            .from("projects")
            .select("id")
            .eq(
              "company_id",
              companyId
            )
            .eq(
              "client_id",
              supabaseClientId
            )
            .ilike(
              "name",
              localProject.name
            )
            .limit(1);


        if (projectError) {
          throw projectError;
        }


        if (
          remoteProjects &&
          remoteProjects.length > 0
        ) {
          supabaseProjectId =
            remoteProjects[0].id;
        }
      }
    }


    const changes = {

      type:
        transaction.type,

      amount:
        transaction.amount,

      currency:
        transaction.currency ||
        "MXN",

      concept:
        transaction.concept,

      client_id:
        supabaseClientId,

      project_id:
        supabaseProjectId,

      category:
        transaction.category ||
        null,

      transaction_date:
        transaction.date,

      notes:
        transaction.notes ||
        null
    };


    let query =
      ovSupabase
        .from("transactions")
        .update(changes)
        .eq(
          "company_id",
          companyId
        );


    if (transaction.supabaseId) {

      query =
        query.eq(
          "id",
          transaction.supabaseId
        );

    } else {

      query =
        query.eq(
          "legacy_id",
          transaction.id
        );
    }


    const {
      error
    } =
      await query;


    if (error) {
      throw error;
    }


    console.info(
      "OV Supabase: movimiento actualizado.",
      transaction.concept
    );

    return true;


  } catch (error) {

    console.error(
      "OV Supabase: error al actualizar movimiento:",
      error
    );

    return false;
  }
}
function saveTransaction() {

  const amount =
    getAmountValue();

  const concept =
    getValue("concept")
      .trim();

  const category =
    getValue("category");

  const date =
    getValue("date");

  const notes =
    getValue("notes")
      .trim();

  const clientId =
    getValue("client");

  const projectId =
    getValue("project");


  if (
    !amount ||
    amount <= 0
  ) {

    alert(
      "Ingresa un monto válido."
    );

    return;
  }


  if (!concept) {

    alert(
      "Escribe el concepto del movimiento."
    );

    return;
  }


  /*
    PROTECCIÓN:
    si hay proyecto debe pertenecer
    al cliente seleccionado.
  */

  if (projectId) {

    const project =
      getProjectById(
        projectId
      );

    if (
      !project ||
      project.clientId !==
        clientId
    ) {

      alert(
        "El proyecto seleccionado no corresponde al cliente."
      );

      return;
    }
  }


  const transactions =
    getTransactions();


  /*
    ACTUALIZAR
  */

  if (
    editingTransactionId
  ) {

    const transaction =
      transactions.find(
        transaction =>
          String(transaction.id) ===
          String(
            editingTransactionId
          )
      );

    if (!transaction) {

      alert(
        "No se encontró el movimiento."
      );

      return;
    }


    transaction.type =
      transactionType;

    transaction.amount =
      amount;

    transaction.currency =
      getCurrency();

    transaction.concept =
      concept;

    transaction.clientId =
      clientId || "";

    transaction.projectId =
      projectId || "";

    transaction.category =
      category;

    transaction.date =
      date || today();

    transaction.notes =
      notes;

    transaction.source =
      transaction.source ||
      "manual";

    transaction.updatedAt =
      Date.now();

updateTransactionInSupabase(
  transaction
);
    editingTransactionId =
      null;

    showToast(
      "Movimiento actualizado"
    );

  } else {

    /*
      MOVIMIENTO NUEVO
    */

  const newTransaction = {

      id:
        Date.now(),

      type:
        transactionType,

      amount,

      currency:
        getCurrency(),

      concept,

      clientId:
        clientId || "",

      projectId:
        projectId || "",

      category,

      source:
        "manual",

      classificationStatus:
        clientId
          ? "manual"
          : "unclassified",

      fiscalStatus:
        "pending",

      reconciliationStatus:
        "pending",

      date:
        date || today(),

      notes,

      createdAt:
        Date.now()
    };
getTransactions().push(
  newTransaction
);

saveTransactionToSupabase(
  newTransaction
);

    showToast(
      "Movimiento guardado"
    );
  }


  companyTransactions[
    activeCompanyId
  ] =
    transactions;


  saveData();

  clearMovementForm();

  setType("income");

  renderClientSelector();
  renderProjectSelector();

  updateMovementFormState();
  updateCompanyUI();
  calculate();


  showPage(
    "home",
    document.querySelectorAll(
      ".navItem"
    )[0]
  );
}


/* =========================================
   NAVEGACIÓN
========================================= */

function showPage(
  page,
  button
) {

  document
    .querySelectorAll(
      ".page"
    )
    .forEach(
      element =>
        element
          .classList
          .remove(
            "active"
          )
    );


  const selectedPage =
    document.getElementById(
      page
    );

  if (selectedPage) {

    selectedPage
      .classList
      .add(
        "active"
      );
  }


  document
    .querySelectorAll(
      ".navItem"
    )
    .forEach(
      element =>
        element
          .classList
          .remove(
            "active"
          )
    );


  if (button) {

    button
      .classList
      .add(
        "active"
      );
  }


  if (
    page === "more"
  ) {

    renderCompanyList();
    renderClientList();
  }


  window.scrollTo(
    0,
    0
  );
}


/* =========================================
   AVISOS
========================================= */

function showToast(message, type = "default") {

  const toast =
    document.getElementById(
      "toast"
    );

  if (!toast) return;

  if (toastTimer) {
    clearTimeout(
      toastTimer
    );
  }

  toast.textContent =
    message || "Guardado";


  /*
    Limpiar estados anteriores
  */

  toast.classList.remove(
    "success",
    "error"
  );


  /*
    Aplicar estado visual
  */

  if (type === "success") {
    toast.classList.add(
      "success"
    );
  }

  if (type === "error") {
    toast.classList.add(
      "error"
    );
  }


  toast.style.display =
    "block";


  toastTimer =
    setTimeout(
      () => {

        toast.style.display =
          "none";

        toast.classList.remove(
          "success",
          "error"
        );

      },
      1800
    );
}


let toastTimer = null;


/* =========================================
   FINANCE — MVP LOCAL
========================================= */

function askOV() {

  const input =
    document.getElementById(
      "aiQuestion"
    );

  if (!input) return;

  const question =
    input.value
      .trim()
      .toLowerCase();

  const transactions =
    getTransactions();

  let income = 0;
  let expense = 0;

  transactions.forEach(
    transaction => {

      if (
        transaction.type ===
        "income"
      ) {

        income +=
          Number(
            transaction.amount
          );

      } else {

        expense +=
          Number(
            transaction.amount
          );
      }
    }
  );


  const company =
    getActiveCompany();

  let response = "";


  /*
    INTENTAR DETECTAR
    CLIENTE EN LA PREGUNTA
  */

  const mentionedClient =
    getClients().find(
      client =>
        question.includes(
          client.name
            .toLowerCase()
        )
    );


  /*
    INTENTAR DETECTAR
    PROYECTO EN LA PREGUNTA
  */

  const mentionedProject =
    getProjects().find(
      project =>
        question.includes(
          project.name
            .toLowerCase()
        )
    );


  if (
    mentionedProject
  ) {

    const projectTransactions =
      transactions.filter(
        transaction =>
          transaction.projectId ===
          mentionedProject.id
      );

    const totals =
      calculateTransactionTotals(
        projectTransactions
      );

    response =
      `${mentionedProject.name} tiene ` +
      `${money(totals.income)} en ingresos y ` +
      `${money(totals.expense)} en gastos. ` +
      `Su flujo registrado es de ` +
      `${money(totals.balance)}.`;

  }

  else if (
    mentionedClient
  ) {

    const clientTransactions =
      transactions.filter(
        transaction =>
          transaction.clientId ===
          mentionedClient.id
      );

    const totals =
      calculateTransactionTotals(
        clientTransactions
      );

    response =
      `${mentionedClient.name} tiene ` +
      `${money(totals.income)} en ingresos y ` +
      `${money(totals.expense)} en gastos. ` +
      `El flujo registrado del cliente es ` +
      `${money(totals.balance)}.`;

  }

  else if (
    question.includes("gasto")
  ) {

    response =
      `${company.name} tiene ` +
      `${money(expense)} ` +
      `registrados en gastos.`;

  }

  else if (
    question.includes("ingreso") ||
    question.includes("venta")
  ) {

    response =
      `${company.name} tiene ` +
      `${money(income)} ` +
      `registrados en ingresos.`;

  }

  else if (
    question.includes("disponible") ||
    question.includes("saldo") ||
    question.includes("flujo")
  ) {

    response =
      `El flujo registrado de ` +
      `${company.name} es de ` +
      `${money(
        income - expense
      )}.`;

  }

  else {

    response =
      `${company.name} tiene ` +
      `${money(income)} en ingresos y ` +
      `${money(expense)} en gastos, ` +
      `dejando un flujo de ` +
      `${money(
        income - expense
      )}.`;
  }


  const box =
    document.getElementById(
      "aiAnswer"
    );

  if (!box) return;

  box.innerText =
    response;

  box.style.display =
    "block";
}


/* =========================================
   TOTALES DE UNA LISTA
========================================= */

function calculateTransactionTotals(
  transactions
) {

  let income = 0;
  let expense = 0;

  transactions.forEach(
    transaction => {

      if (
        transaction.type ===
        "income"
      ) {

        income +=
          Number(
            transaction.amount
          );

      } else {

        expense +=
          Number(
            transaction.amount
          );
      }
    }
  );

  return {
    income,
    expense,
    balance:
      income - expense
  };
}


/* =========================================
   FECHAS
========================================= */

function today() {

  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return (
    `${year}-` +
    `${month}-` +
    `${day}`
  );
}


function formatDate(date) {

  if (!date) return "";

  const parts =
    date.split("-");

  if (
    parts.length !== 3
  ) {
    return date;
  }

  return (
    `${parts[2]}/` +
    `${parts[1]}/` +
    `${parts[0]}`
  );
}


/* =========================================
   IDs
========================================= */

function createId(prefix) {

  return (
    `${prefix}-` +
    `${Date.now()}-` +
    `${Math.random()
      .toString(36)
      .slice(2, 8)}`
  );
}


/* =========================================
   UTILIDADES
========================================= */

function escapeHTML(value) {

  const div =
    document.createElement(
      "div"
    );

  div.textContent =
    value ?? "";

  return div.innerHTML;
}


function setText(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );

  if (element) {
    element.innerText =
      value;
  }
}


function setValue(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );

  if (element) {
    element.value =
      value ?? "";
  }
}


function getValue(id) {

  const element =
    document.getElementById(
      id
    );

  if (!element) return "";

  return element.value || "";
}


/* =========================================
   MIGRAR MOVIMIENTOS ANTIGUOS
========================================= */

function migrateTransactions() {

  Object.keys(
    companyTransactions
  ).forEach(companyId => {

    companyTransactions[
      companyId
    ] =
      (
        companyTransactions[
          companyId
        ] || []
      ).map(
        transaction => ({
          ...transaction,

          clientId:
            transaction.clientId ||
            "",

          projectId:
            transaction.projectId ||
            "",

          currency:
            transaction.currency ||
            "MXN",

          source:
            transaction.source ||
            "manual",

          classificationStatus:
            transaction.classificationStatus ||
            (
              transaction.clientId
                ? "manual"
                : "unclassified"
            ),

          fiscalStatus:
            transaction.fiscalStatus ||
            "pending",

          reconciliationStatus:
            transaction.reconciliationStatus ||
            "pending"
        })
      );
  });
}


/* =========================================
   INICIAR OV
========================================= */

function initializeOV() {

  migrateTransactions();

  const dateInput =
    document.getElementById(
      "date"
    );

  if (dateInput) {
    dateInput.value =
      today();
  }

  setupAmountInput();

  saveData();

  renderCompanySelector();

  renderClientSelector();

  renderProjectSelector();

  updateCompanyUI();

  updateMovementFormState();

  calculate();
}


/* =========================================
   ARRANQUE
========================================= */

initializeOV();

/* =========================================
   OV APP — MIGRACIÓN LOCAL → SUPABASE
   FASE 1

   IMPORTANTE:
   - No elimina datos locales.
   - No se ejecuta automáticamente.
   - Evita volver a ejecutarse si ya terminó.
========================================= */

async function migrateOVLocalDataToSupabase() {

  console.log(
    "OV MIGRACIÓN: iniciando..."
  );


  /*
    1. Verificar sesión y empresa
  */

  if (
    !window.OV_SESSION ||
    !window.OV_SESSION.user ||
    !window.OV_SESSION.company
  ) {

    showToast(
      "No hay sesión o empresa activa",
      "error"
    );

    return;
  }


  const userId =
    window.OV_SESSION.user.id;

  const companyId =
    window.OV_SESSION.company.id;


  try {

    /*
      2. Obtener datos locales
    */

    const localClients =
      getClients();

    const localProjects =
      getProjects();

    const localTransactions =
  getTransactions();

    /*
      3. Localizar ALTOZANO local
    */

    const localClient =
      localClients.find(
        client =>
          client.name
            .trim()
            .toLowerCase() ===
          "altozano"
      );


    if (!localClient) {

      throw new Error(
        "No se encontró ALTOZANO local."
      );
    }


    /*
      4. Buscar ALTOZANO en Supabase
    */

    const {
      data: supabaseClients,
      error: clientError
    } =
      await ovSupabase
        .from("clients")
        .select("id, name")
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "name",
          "ALTOZANO"
        );


    if (clientError) {
      throw clientError;
    }


    if (
      !supabaseClients ||
      supabaseClients.length === 0
    ) {

      throw new Error(
        "ALTOZANO no existe en Supabase."
      );
    }


    const supabaseClientId =
      supabaseClients[0].id;


    /*
      5. Localizar proyecto lagos local
    */

    const localProject =
      localProjects.find(
        project =>
          project.name
            .trim()
            .toLowerCase() ===
          "lagos"
      );


    if (!localProject) {

      throw new Error(
        "No se encontró lagos local."
      );
    }


    /*
      6. Buscar lagos en Supabase
    */

    const {
      data: supabaseProjects,
      error: projectError
    } =
      await ovSupabase
        .from("projects")
        .select("id, name")
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "client_id",
          supabaseClientId
        )
        .eq(
          "name",
          "lagos"
        );


    if (projectError) {
      throw projectError;
    }


    if (
      !supabaseProjects ||
      supabaseProjects.length === 0
    ) {

      throw new Error(
        "lagos no existe en Supabase."
      );
    }


    const supabaseProjectId =
      supabaseProjects[0].id;


    /*
      7. Migrar movimientos
    */

    let migratedCount = 0;
    let existingCount = 0;


    for (
      const transaction
      of localTransactions
    ) {

      /*
        Evitar duplicados mediante legacy_id
      */

      const {
        data: existingTransactions,
        error: existingError
      } =
        await ovSupabase
          .from("transactions")
          .select("id")
          .eq(
            "company_id",
            companyId
          )
          .eq(
            "legacy_id",
            transaction.id
          );


      if (existingError) {
        throw existingError;
      }


      if (
        existingTransactions &&
        existingTransactions.length > 0
      ) {

        existingCount++;

        continue;
      }


      /*
        Traducir IDs locales
        a UUID de Supabase
      */

      let supabaseTransactionClientId =
        null;

      let supabaseTransactionProjectId =
        null;


      if (
        transaction.clientId ===
        localClient.id
      ) {

        supabaseTransactionClientId =
          supabaseClientId;
      }


      if (
        transaction.projectId ===
        localProject.id
      ) {

        supabaseTransactionProjectId =
          supabaseProjectId;

        supabaseTransactionClientId =
          supabaseClientId;
      }


      /*
        Insertar movimiento
      */

      const {
        error: insertError
      } =
        await ovSupabase
          .from("transactions")
          .insert({

            company_id:
              companyId,

            client_id:
              supabaseTransactionClientId,

            project_id:
              supabaseTransactionProjectId,

            created_by:
              userId,

            type:
              transaction.type,

            amount:
              transaction.amount,

            currency:
              transaction.currency ||
              "MXN",

            concept:
              transaction.concept,

            category:
              transaction.category ||
              null,

            notes:
              transaction.notes ||
              null,

            transaction_date:
              transaction.date ||
              today(),

            source:
              transaction.source ||
              "manual",

            classification_status:
              transaction.classificationStatus ||
              "unclassified",

            fiscal_status:
              transaction.fiscalStatus ||
              "pending",

            reconciliation_status:
              transaction.reconciliationStatus ||
              "pending",

            legacy_id:
              transaction.id
          });


      if (insertError) {
        throw insertError;
      }


      migratedCount++;
    }


    /*
      8. Marcar migración completa
      solo después de terminar
    */

    localStorage.setItem(
      "ov_supabase_migration_v1",
      "completed"
    );


    console.log(
      "OV MIGRACIÓN COMPLETA",
      {
        total:
          localTransactions.length,

        migrated:
          migratedCount,

        alreadyExisting:
          existingCount
      }
    );


    showToast(
      migratedCount > 0
        ? `${migratedCount} movimientos migrados`
        : "Movimientos ya sincronizados",
      "success"
    );


  } catch (error) {

    console.error(
      "OV MIGRACIÓN ERROR:",
      error
    );


    showToast(
      "Error al migrar movimientos",
      "error"
    );
  }
}


/* =========================================
   EJECUCIÓN MANUAL DE MIGRACIÓN

   NO ACTIVAR TODAVÍA
========================================= */

//migrateOVLocalDataToSupabase();
