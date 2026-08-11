
  let contacts = [];

function uid(){
  return "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

  async function loadContacts(){
  try{
    const raw = localStorage.getItem("contacts");
    contacts = raw ? JSON.parse(raw) : [];
  }catch(e){
    contacts = [];
  }
}

async function saveContacts(){
  try{
    localStorage.setItem("contacts", JSON.stringify(contacts));
  }catch(e){
    console.error("Erreur de sauvegarde :", e);
  }
}
  function getFilteredContacts(){
  const searchValue = document.getElementById("search").value.toLowerCase();
  const statutValue = document.getElementById("filterStatut").value;

  const resultat = contacts.filter(c => {
    const matchSearch = c.entreprise.toLowerCase().includes(searchValue);
    const matchStatut = statutValue === "all" || c.statut === statutValue;
    return matchSearch && matchStatut;
  });

  return resultat.sort((a, b) => a.priorite - b.priorite);
}

  function estEnRetard(dateStr){
    if(!dateStr) return false;
    const aujourdhui = new Date().toISOString().slice(0, 10);
    return dateStr < aujourdhui;
  }

  function renderTable(){
    const tbody = document.getElementById("tableBody");
    const liste = getFilteredContacts();

    tbody.innerHTML= liste.map(c => `
      <tr data-id="${c.id}">
        <td>${c.priorite}</td>
        <td>${c.entreprise}</td>
        <td>${c.ville}</td>
        <td>
          <div>${c.recruteur || "—"}</div>
          <div class="contact-links">
    ${c.email ? `<a href="mailto:${c.email}">e-mail</a>` : ""}
    ${c.telephone ? `<a href="tel:${c.telephone}">tél.</a>` : ""}
    ${c.linkedin ? `<a href="${c.linkedin}" target="_blank" rel="noopener">linkedin</a>` : ""}
    ${c.siteCarriere ? `<a href="${c.siteCarriere}" target="_blank" rel="noopener">site</a>` : ""}
          </div>
        </td>
        <td>
        <span class="badge" data-s="${c.statut}">${c.statut}
        </span>
        </td>
        <td>
          <span class="relance-date ${estEnRetard(c.dateRelance) ? "overdue" : ""}">${c.dateRelance || "—"}
          </span>
        </td>
        <td> 
      <button type="button" data-action="edit" data-id="${c.id}">Modifier</button>
      <button type="button" data-action="delete" data-id="${c.id}">Suppr.</button>
        </td>
      </tr>
    `).join("");
  }

  function renderStats(){
  const total = contacts.length;

  const aContacter = contacts.filter(c => c.statut === "a_contacter").length;
  const relance = contacts.filter(c => c.statut === "relance").length;

  const html = `
    <div class="stat">
      <div class="n">${total}</div>
      <div class="l">Total</div>
    </div>
    <div class="stat">
      <div class="n">${aContacter}</div>
      <div class="l">À contacter</div>
    </div>
    <div class="stat">
      <div class="n">${relance}</div>
      <div class="l">Relance à faire</div>
    </div>
  `;

  document.getElementById("key-data").innerHTML = html;
}


const overlay = document.getElementById("modalOverlay");
let editingId = null;

function openModal(contact){
  if(contact){
    editingId = contact.id;
    document.getElementById("modalTitle").textContent = "Modifier le contact";
    document.getElementById("fPriorite").value = contact.priorite;
    document.getElementById("fEntreprise").value = contact.entreprise;
    document.getElementById("fVille").value = contact.ville;
    document.getElementById("fRecruteur").value = contact.recruteur;
    document.getElementById("fSite").value = contact.siteCarriere;
    document.getElementById("fEmail").value = contact.email;
    document.getElementById("fTel").value = contact.telephone;
    document.getElementById("fLinkedin").value = contact.linkedin;
    document.getElementById("fStatut").value = contact.statut;
    document.getElementById("fRelance").value = contact.dateRelance || "";
  }else{
    editingId = null;
    document.getElementById("modalTitle").textContent = "Nouveau contact";
  }
  overlay.classList.remove("hidden");
}

function closeModal(){
  overlay.classList.add("hidden");
}

document.getElementById("btnNew").addEventListener("click", function(){
  openModal();
});
document.getElementById("btnCancel").addEventListener("click", closeModal);

overlay.addEventListener("click", function(e){
  if(e.target === overlay){
    closeModal();
  }
});

function parseImportText(texte){
  const lignes = texte.split("\n")
    .map(ligne => ligne.trim())
    .filter(ligne => ligne.length > 0);

  return lignes.map(ligne => ligne.split("\t"));
}

function creerContactsDepuisImport(lignes){
  const lignesDonnees = lignes.slice(1);

  const nouveaux = lignesDonnees.map(function(ligne){
    const [priorite, entreprise, ville, siteCarriere, recruteur, email, telephone, linkedin] = ligne;
    return {
      id: uid(),
      priorite: Number(priorite) || 2,
      entreprise: entreprise || "",
      ville: ville || "",
      siteCarriere: siteCarriere || "",
      recruteur: recruteur || "",
      email: email || "",
      telephone: telephone || "",
      linkedin: linkedin || "",
      statut: "a_contacter"
    };
  });

  return nouveaux.filter(c => c.entreprise !== "");
}

const importOverlay = document.getElementById("importOverlay");

document.getElementById("btnImport").addEventListener("click", function(){
  importOverlay.classList.remove("hidden");
});

document.getElementById("btnImportCancel").addEventListener("click", function(){
  importOverlay.classList.add("hidden");
  document.getElementById("importText").value = "";
});

importOverlay.addEventListener("click", function(e){
  if(e.target === importOverlay){
    importOverlay.classList.add("hidden");
  }
});

document.getElementById("btnImportGo").addEventListener("click", async function(){
  const texte = document.getElementById("importText").value;
  const lignes = parseImportText(texte);
  const nouveaux = creerContactsDepuisImport(lignes);

  contacts = contacts.concat(nouveaux);

  await saveContacts();
  renderTable();
  renderStats();
  importOverlay.classList.add("hidden");
  document.getElementById("importText").value = "";

  alert(`${nouveaux.length} contact(s) importé(s).`);
});

document.getElementById("tableBody").addEventListener("click", async function(e){
  const btn = e.target.closest("button[data-action]");
  if(!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if(action === "delete"){
    const contact = contacts.find(c => c.id === id);
    if(!contact) return;

    if(confirm(`Supprimer le contact "${contact.entreprise}" ?`)){
      contacts = contacts.filter(c => c.id !== id);
      await saveContacts();
      renderTable();
      renderStats();
    }
  }

  if(action === "edit"){
  const contact = contacts.find(c => c.id === id);
  if(contact) openModal(contact);
}
});

document.getElementById("search").addEventListener("input", renderTable);
document.getElementById("filterStatut").addEventListener("change", renderTable);

document.getElementById("contactForm").addEventListener("submit", async function(e){
  e.preventDefault();

  const donnees = {
    priorite: Number(document.getElementById("fPriorite").value),
    entreprise: document.getElementById("fEntreprise").value,
    ville: document.getElementById("fVille").value,
    recruteur: document.getElementById("fRecruteur").value,
    siteCarriere: document.getElementById("fSite").value,
    email: document.getElementById("fEmail").value,
    telephone: document.getElementById("fTel").value,
    linkedin: document.getElementById("fLinkedin").value,
    statut: document.getElementById("fStatut").value,
    dateRelance: document.getElementById("fRelance").value,
  };

 if(editingId){
    const contact = contacts.find(c => c.id === editingId);
    Object.assign(contact, donnees);
  }else{
    contacts.push({ id: uid(), ...donnees});
  }

   await saveContacts();
   renderTable();
   renderStats();
   closeModal();
   document.getElementById("contactForm").reset();

});

async function init(){
  await loadContacts();
  renderTable();
  renderStats();
}

init();