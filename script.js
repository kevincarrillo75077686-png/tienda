/* ====== CONFIG / HELPERS ====== */
const ADMIN_EMAIL = "kevincarrillo75077686@gmail.com";
const ADMIN_PASS  = "GAVIIDIA";

const KEY_USERS   = "mt_users";
const KEY_TICKETS = "mt_tickets";
const KEY_REVIEWS = "mt_reviews";
const KEY_SESSION = "mt_session";

function loadUsers(){ return JSON.parse(localStorage.getItem(KEY_USERS) || "{}"); }
function saveUsers(u){ localStorage.setItem(KEY_USERS, JSON.stringify(u)); }

function loadTickets(){ return JSON.parse(localStorage.getItem(KEY_TICKETS) || "{}"); }
function saveTickets(t){ localStorage.setItem(KEY_TICKETS, JSON.stringify(t)); }

function loadReviews(){ return JSON.parse(localStorage.getItem(KEY_REVIEWS) || "[]"); }
function saveReviews(r){ localStorage.setItem(KEY_REVIEWS, JSON.stringify(r)); }

function saveSession(obj){ localStorage.setItem(KEY_SESSION, JSON.stringify(obj)); }
function loadSession(){ return JSON.parse(localStorage.getItem(KEY_SESSION) || "null"); }
function clearSession(){ localStorage.removeItem(KEY_SESSION); }

function escapeHtml(str){ if(!str) return ""; return String(str).replace(/[&<>"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }

function emitUpdate(key){
  // fuerza el evento "storage" local para que las otras vistas se actualicen
  const data = localStorage.getItem(key);
  localStorage.setItem(key, data);
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

/* ====== LOGIN / REGISTER ====== */
if (document.getElementById("loginForm")) {
  const roleClientBtn = document.getElementById("roleClient");
  const roleAdminBtn  = document.getElementById("roleAdmin");
  const roleSlider    = document.getElementById("roleSlider");
  const loginBox      = document.getElementById("loginBox");
  const registerBox   = document.getElementById("registerBox");
  const showRegister  = document.getElementById("showRegister");
  const backToLogin   = document.getElementById("backToLogin");
  const registerForm  = document.getElementById("registerForm");
  const regAvatar     = document.getElementById("regAvatar");
  let role = "client";

  roleClientBtn.addEventListener("click", ()=>{ role="client"; roleSlider.style.transform="translateX(0)"; });
  roleAdminBtn.addEventListener("click", ()=>{ role="admin"; roleSlider.style.transform="translateX(86px)"; });
  showRegister.addEventListener("click",(e)=>{ e.preventDefault(); loginBox.classList.add("hidden"); registerBox.classList.remove("hidden");});
  backToLogin.addEventListener("click",(e)=>{ e.preventDefault(); registerBox.classList.add("hidden"); loginBox.classList.remove("hidden");});

  function fileToDataURL(file){
    return new Promise((res, rej)=>{
      const fr = new FileReader();
      fr.onload = ()=> res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }

  registerForm.addEventListener("submit", async (ev)=>{
    ev.preventDefault();
    const name  = (document.getElementById("regName").value || "").trim();
    const email = ((document.getElementById("regEmail").value || "").trim()).toLowerCase();
    const pass  = (document.getElementById("regPass").value || "").trim();

    if (!name || !email || !pass) return alert("Completa todos los campos.");
    const users = loadUsers();
    if (users[email]) return alert("Ese correo ya está registrado.");

    let avatar = null;
    const f = regAvatar.files && regAvatar.files[0];
    if (f) avatar = await fileToDataURL(f);

    users[email] = { name, email, pass, avatar };
    saveUsers(users);

    const tickets = loadTickets();
    tickets[email] = tickets[email] ?? 0;
    saveTickets(tickets);

    emitUpdate(KEY_USERS);
    emitUpdate(KEY_TICKETS);
    alert("Cuenta creada correctamente. Ya puedes iniciar sesión.");
    registerForm.reset();
    registerBox.classList.add("hidden");
    loginBox.classList.remove("hidden");
  });

  document.getElementById("loginForm").addEventListener("submit", (ev)=>{
    ev.preventDefault();
    const email = ((document.getElementById("loginEmail").value||"").trim()).toLowerCase();
    const pass  = (document.getElementById("loginPass").value||"").trim();

    if (role === "admin") {
      if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
        saveSession({ role:"admin", email });
        window.location.href = "dashboard.html";
      } else alert("Credenciales incorrectas.");
      return;
    }

    const users = loadUsers();
    if (!users[email] || users[email].pass !== pass) return alert("Usuario o contraseña incorrectos.");
    saveSession({ role:"client", email });
    window.location.href = "dashboard.html";
  });
}

/* ====== DASHBOARD ====== */
if (document.getElementById("logoutBtn")) {
  const session = loadSession();
  if (!session) { window.location.href = "index.html"; throw "no session"; }

  const role = session.role;
  const myEmail = session.email;
  document.getElementById("userLabel").textContent = role === "admin" ? "Administrador" : session.email;

  document.getElementById("logoutBtn").addEventListener("click", ()=>{
    if (!confirm("¿Cerrar sesión?")) return;
    clearSession(); window.location.href = "index.html";
  });

  document.getElementById("copyLink").addEventListener("click", ()=>{
    const link = `${location.origin}${location.pathname.replace("dashboard.html","")}?user=${encodeURIComponent(session.email)}`;
    navigator.clipboard.writeText(link).then(()=>alert("Enlace copiado"));
  });

  if (role === "client") buildClientUI(myEmail);
  else buildAdminUI();

  /* ---- CLIENT ---- */
  function buildClientUI(email){
    document.getElementById("sidebar").classList.add("hidden");
    document.getElementById("clientPanel").classList.remove("hidden");

    const users = loadUsers();
    const user = users[email];
    if (!user) return alert("Usuario no encontrado");

    const avatarEl = document.getElementById("clientAvatar");
    avatarEl.innerHTML = user.avatar ? `<img src="${user.avatar}">` : `<div>${user.name[0]}</div>`;
    document.getElementById("clientName").textContent = user.name;
    document.getElementById("clientEmail").textContent = user.email;

    const link = `${location.origin}${location.pathname.replace("dashboard.html","")}?user=${encodeURIComponent(user.email)}`;
    document.getElementById("accountLink").value = link;
    document.getElementById("copyAccount").addEventListener("click", ()=>navigator.clipboard.writeText(link));

    renderClientProgress(email);
    renderReviews();

    document.getElementById("sendReview").addEventListener("click", ()=>{
      const text = (document.getElementById("myReview").value||"").trim();
      if (!text) return alert("Escribe algo.");
      const reviews = loadReviews();
      reviews.unshift({ name:user.name, email:user.email, text, date:new Date().toLocaleString() });
      saveReviews(reviews);
      document.getElementById("myReview").value = "";
      emitUpdate(KEY_REVIEWS);
      renderReviews();
    });

    window.addEventListener("storage", (ev)=>{
      if (ev.key === KEY_TICKETS) renderClientProgress(email);
      if (ev.key === KEY_REVIEWS) renderReviews();
    });
  }

  function renderClientProgress(email){
    const tickets = loadTickets();
    const progress = tickets[email] ?? 0;
    const line = document.getElementById("progressLine");
    const nums = document.getElementById("progressNums");
    line.innerHTML = `<div class="fill" style="width:${(progress/9)*100}%"></div>`;
    nums.innerHTML = "";
    for (let i=1;i<=9;i++){
      const n=document.createElement("div");
      n.className="number"+(i<=progress?" filled":"");
      n.textContent=i;
      nums.appendChild(n);
    }
    if(progress>=9){
      const p=document.createElement("div");
      p.className="number premio";
      p.textContent="PREMIO";
      nums.appendChild(p);
    }
  }

  /* ---- ADMIN ---- */
  function buildAdminUI(){
    document.getElementById("sidebar").classList.remove("hidden");
    document.getElementById("adminPanel").classList.remove("hidden");
    renderAdminUsers();
    renderAdminStats();
    renderReviews();

    window.addEventListener("storage",(ev)=>{
      if(ev.key===KEY_TICKETS) renderAdminUsers();
      if(ev.key===KEY_REVIEWS) renderReviews();
    });
  }

  function renderAdminUsers(){
    const users = loadUsers();
    const tickets = loadTickets();
    const list = document.getElementById("adminUsersArea");
    list.innerHTML = "";

    Object.values(users).forEach(u=>{
      const prog = tickets[u.email] ?? 0;
      const card = document.createElement("div");
      card.className="ticket";
      card.innerHTML=`<strong>${escapeHtml(u.name)} (${escapeHtml(u.email)})</strong>
        <div class="ticket-grid" id="tg-${u.email.replace(/[@.]/g,'_')}"></div>
        <div style="margin-top:10px">
          <button class="btn small advance" data-email="${u.email}">Avanzar 1</button>
          <button class="btn small reset" data-email="${u.email}">Reiniciar</button>
        </div>`;
      list.appendChild(card);

      const grid=card.querySelector(".ticket-grid");
      for(let i=1;i<=9;i++){
        const cell=document.createElement("div");
        cell.className="ticket-number"+(i<=prog?" marked":"");
        cell.textContent=i;
        cell.addEventListener("click",()=>{
          if(confirm(`¿Marcar hasta ${i}?`)){
            const t=loadTickets();t[u.email]=i;saveTickets(t);
            emitUpdate(KEY_TICKETS);renderAdminUsers();renderAdminStats();
          }
        });
        grid.appendChild(cell);
      }
      const prize=document.createElement("div");
      prize.className="ticket-number"+(prog>=9?" marked premio":"");
      prize.textContent="🎁";
      grid.appendChild(prize);
    });

    list.querySelectorAll(".advance").forEach(b=>b.onclick=()=>{
      const email=b.dataset.email;
      const t=loadTickets();
      if((t[email]??0)<9){t[email]++;saveTickets(t);emitUpdate(KEY_TICKETS);renderAdminUsers();renderAdminStats();}
      else alert("Ya llegó al premio.");
    });
    list.querySelectorAll(".reset").forEach(b=>b.onclick=()=>{
      const email=b.dataset.email;
      if(confirm("¿Reiniciar progreso?")){
        const t=loadTickets();t[email]=0;saveTickets(t);
        emitUpdate(KEY_TICKETS);renderAdminUsers();renderAdminStats();
      }
    });
  }

  function renderAdminStats(){
    const users = loadUsers();
    const tickets = loadTickets();
    document.getElementById("statUsers").textContent = Object.keys(users).length;
    let total = 0;
    Object.values(tickets).forEach(v=>total+=v);
    document.getElementById("statSales").textContent = "$"+total.toFixed(2);
  }

  /* ---- REVIEWS ---- */
  function renderReviews(){
    const area = document.getElementById("reviewsList");
    if(!area) return;
    const reviews = loadReviews();
    area.innerHTML = "";
    if(reviews.length===0){
      area.innerHTML="<p class='muted'>Sin reseñas aún.</p>";
      return;
    }
    reviews.forEach(r=>{
      const div=document.createElement("div");
      div.className="review";
      div.innerHTML=`<strong>${escapeHtml(r.name)}</strong> <span class="muted small">(${escapeHtml(r.date)})</span><p>${escapeHtml(r.text)}</p>`;
      area.appendChild(div);
    });
  }
}
