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

function deleteTransaction(id) {

  const transactions =
    getTransactions();

  const transaction =
    transactions.find(
      transaction =>
        Number(transaction.id) ===
        Number(id)
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


  companyTransactions[
    activeCompanyId
  ] =
    transactions.filter(
      transaction =>
        Number(transaction.id) !==
        Number(id)
    );


  if (
    editingTransactionId ===
    Number(id)
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
          Number(transaction.id) ===
          Number(
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


    editingTransactionId =
      null;

    showToast(
      "Movimiento actualizado"
    );

  } else {

    /*
      MOVIMIENTO NUEVO
    */

    transactions.push({

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
    });


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


  /*
    2. Evitar una segunda migración
  */

  const migrationCompleted =
    localStorage.getItem(
      "ov_supabase_migration_v1"
    );


  if (
    migrationCompleted === "completed"
  ) {

    showToast(
      "Los datos ya fueron migrados"
    );

    return;
  }


  const userId =
    window.OV_SESSION.user.id;

  const companyId =
    window.OV_SESSION.company.id;


  try {

    /*
      3. Buscar ALTOZANO en Supabase
    */

    let {
      data: existingClients,
      error: clientSearchError
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


    if (clientSearchError) {
      throw clientSearchError;
    }


    let clientId;


    /*
      4. Crear ALTOZANO solamente
      si todavía no existe
    */

    if (
      existingClients &&
      existingClients.length > 0
    ) {

      clientId =
        existingClients[0].id;

    } else {

      const {
        data: newClient,
        error: clientInsertError
      } =
        await ovSupabase
          .from("clients")
          .insert({
            company_id: companyId,
            name: "ALTOZANO"
          })
          .select("id, name")
          .single();


      if (clientInsertError) {
        throw clientInsertError;
      }


      clientId =
        newClient.id;
    }


    /*
      5. Buscar proyecto lagos
    */

    const {
      data: existingProjects,
      error: projectSearchError
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
          clientId
        )
        .eq(
          "name",
          "lagos"
        );


    if (projectSearchError) {
      throw projectSearchError;
    }


    let projectId;


    /*
      6. Crear lagos solamente
      si todavía no existe
    */

    if (
      existingProjects &&
      existingProjects.length > 0
    ) {

      projectId =
        existingProjects[0].id;

    } else {

      const {
        data: newProject,
        error: projectInsertError
      } =
        await ovSupabase
          .from("projects")
          .insert({
            company_id: companyId,
            client_id: clientId,
            name: "lagos"
          })
          .select("id, name")
          .single();


      if (projectInsertError) {
        throw projectInsertError;
      }


      projectId =
        newProject.id;
    }


    /*
      7. Guardar referencias de migración.

      TODAVÍA NO MIGRAMOS MOVIMIENTOS.

      Primero comprobaremos que:
      Grupo Decko → ALTOZANO → lagos

      quedó correctamente creado.
    */

    localStorage.setItem(
      "ov_migrated_client_id",
      clientId
    );

    localStorage.setItem(
      "ov_migrated_project_id",
      projectId
    );


    console.log(
      "OV MIGRACIÓN FASE 1 COMPLETA",
      {
        companyId,
        clientId,
        projectId,
        userId
      }
    );


    showToast(
      "Cliente y proyecto migrados",
      "success"
    );


  } catch (error) {

    console.error(
      "OV MIGRACIÓN ERROR:",
      error
    );


    showToast(
      "Error al migrar datos",
      "error"
    );
  }
}


/* =========================================
   EJECUCIÓN MANUAL DE MIGRACIÓN

   NO ACTIVAR TODAVÍA
========================================= */

//migrateOVLocalDataToSupabase();
