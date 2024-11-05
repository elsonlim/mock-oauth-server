function buildKey(directoryID, client_id) {
  return `${directoryID}-${client_id}`;
}

function loadUserData(directoryID, client_id) {
  const key = buildKey(directoryID, client_id);
  const userDataJSON = localStorage.getItem(key) || "[]";
  const userData = JSON.parse(userDataJSON);
  return userData;
}

function renderQuickSubmit(directoryID, client_id) {
  const userDataArray = loadUserData(directoryID, client_id);
  const quickSubmitContainer = document.getElementById("quickSubmitContainer");
  quickSubmitContainer.innerHTML = "";

  if (userDataArray.length > 0) {
    const heading = document.createElement("h3");
    heading.textContent = "Quick Submit (History)";
    quickSubmitContainer.appendChild(heading);

    userDataArray.forEach((userData) => {
      const div = document.createElement("div");
      div.style.border = "1px solid #ccc";
      div.style.padding = "10px";
      div.style.marginBottom = "10px";
      div.style.cursor = "pointer";

      div.addEventListener("mouseover", () => {
        div.style.borderWidth = "3px";
      });

      div.addEventListener("mouseout", () => {
        div.style.borderWidth = "1px";
      });

      div.addEventListener("click", () => {
        document.getElementById("email").value = userData.email;
        document.getElementById("family_name").value = userData.family_name;
        document.getElementById("given_name").value = userData.given_name;
        document.getElementById("tp_acct_typ").value = userData.tp_acct_typ;

        document.getElementById("loginForm").submit();
      });

      div.innerHTML = `
        <div>given_name: ${userData.given_name}</div>
        <div>family_name: ${userData.family_name}</div>
        <div>email: ${userData.email}</div>
        <div>tp_acct_typ: ${userData.tp_acct_typ}</div>
      `;

      quickSubmitContainer.appendChild(div);
    });
  }
}

function saveUserData(directoryID, client_id, newUserData) {
  const userData = loadUserData(directoryID, client_id);

  let isDuplicate = false;
  for (const key in userData) {
    if (userData[key].email === newUserData.email) {
      isDuplicate = true;
      break;
    }
  }

  if (!isDuplicate) {
    userData.push(newUserData);
    const key = buildKey(directoryID, client_id);
    localStorage.setItem(key, JSON.stringify(userData));
  }
}

function handleFormSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const email = form.elements["email"].value;
  const family_name = form.elements["family_name"].value;
  const given_name = form.elements["given_name"].value;
  const tp_acct_typ = form.elements["tp_acct_typ"].value;

  const newUserData = {
    email: email,
    family_name: family_name,
    given_name: given_name,
    tp_acct_typ: tp_acct_typ,
  };

  const action = form.action;
  const url = new URL(action);

  const directoryID = url.pathname.split("/")[1];
  const client_id = url.searchParams.get("client_id");

  console.log(directoryID, client_id);

  saveUserData(directoryID, client_id, newUserData);

  form.submit();
}

window.oauthUtils = {
  loadUserData,
  handleFormSubmit,
};
