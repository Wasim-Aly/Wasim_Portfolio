(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const cfg = window.SITE_CONFIG || {};
  const projectFrames = [$("#dashboardFrame"), $("#socialFrame"), $("#promotionFrame"), $("#threadGlowFrame")].filter(Boolean);
  const syncDashboardTheme = () => {
    projectFrames.forEach(frame => frame.contentWindow?.postMessage({
      type: "portfolio-theme",
      theme: document.documentElement.dataset.theme
    }, "*"));
  };

  /* Theme preference */
  const themeToggle = $("#themeToggle"), themeIcon = $("#themeIcon"), themeColor = $("#themeColor");
  const setTheme = (theme, persist = true) => {
    const isDark = theme === "dark";
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    themeToggle.setAttribute("aria-pressed", isDark);
    themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    themeToggle.title = isDark ? "Switch to light mode" : "Switch to dark mode";
    themeIcon.setAttribute("href", isDark ? "#i-sun" : "#i-moon");
    themeColor.content = isDark ? "#111a16" : "#f6f7f2";
    syncDashboardTheme();
    if (persist) {
      try { localStorage.setItem("wasim-theme", isDark ? "dark" : "light"); } catch {}
    }
  };
  setTheme(document.documentElement.dataset.theme || "light", false);
  themeToggle.addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });
  projectFrames.forEach(frame => frame.addEventListener("load", syncDashboardTheme));
  addEventListener("message", e => {
    const frame = projectFrames.find(item => item.contentWindow === e.source);
    if (!frame || e.data?.type !== "dashboard-height" || !Number.isFinite(e.data.height)) return;
    frame.style.height = Math.max(660, Math.ceil(e.data.height)) + "px";
  });

  $("#year").textContent = new Date().getFullYear();

  /* Header: scrolled state + progress bar */
  const header = $("#header"), bar = $("#progress");
  const onScroll = () => {
    header.classList.toggle("scrolled", window.scrollY > 12);
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + "%";
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Mobile menu */
  const btn = $("#menuBtn"), nav = $("#nav");
  const setMenu = (open) => {
    nav.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open);
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  btn.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
  $$("a", nav).forEach(a => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });

  /* Active nav link */
  const links = $$(".nav a[href^='#']:not(.nav-cta)");
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        links.forEach(l => l.classList.toggle("active", l.getAttribute("href") === "#" + en.target.id));
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  links.forEach(l => { const t = $(l.getAttribute("href")); if (t) io.observe(t); });

  /* Work filter */
  const chips = $$(".chip"), projects = $$(".proj");
  chips.forEach(c => c.addEventListener("click", () => {
    chips.forEach(x => { x.classList.toggle("is-on", x === c); x.setAttribute("aria-pressed", x === c); });
    const f = c.dataset.filter;
    projects.forEach(p => { p.hidden = !(f === "all" || p.dataset.cat === f); });
  }));

  /* Project dialog */
  const dlg = $("#dlg");
  projects.forEach(p => {
    const button = $(".proj-btn", p);
    if (!button) return;
    button.addEventListener("click", () => {
      $("#dlgImg").src = $("img", p).src;
      $("#dlgImg").alt = $("img", p).alt;
      $("#dlgTitle").textContent = p.dataset.title;
      $("#dlgRole").textContent = p.dataset.role;
      $("#dlgTools").textContent = p.dataset.tools;
      $("#dlgDesc").textContent = p.dataset.desc;
      dlg.showModal();
    });
  });
  $("#dlgClose").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });

  /* Contact form */
  const form = $("#form"), status = $("#formStatus");
  const say = (msg, cls) => { status.textContent = msg; status.className = "form-status " + (cls || ""); };
  const validate = () => {
    let ok = true;
    $$("input[required], textarea[required]", form).forEach(f => {
      const field = f.closest(".field");
      $(".err", field)?.remove();
      let msg = "";
      if (!f.value.trim()) msg = "Please fill in this field.";
      else if (f.type === "email" && !/^\S+@\S+\.\S+$/.test(f.value)) msg = "Enter a valid email address.";
      field.classList.toggle("bad", !!msg);
      if (msg) { ok = false; const s = document.createElement("span"); s.className = "err"; s.textContent = msg; field.append(s); }
    });
    return ok;
  };
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!validate()) { say("Check the highlighted fields and try again.", "fail"); return; }
    const data = Object.fromEntries(new FormData(form));
    if (cfg.formspreeId) {
      say("Sending...");
      try {
        const r = await fetch("https://formspree.io/f/" + cfg.formspreeId, {
          method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        if (!r.ok) throw new Error();
        form.reset(); say("Message sent. I'll reply by email soon.", "ok");
      } catch { say("The message could not be sent. Please check the form setup and try again.", "fail"); }
    } else {
      if (!cfg.email || cfg.email === "your-email@example.com") {
        say("Add your email address in js/config.js before using the form.", "fail");
        return;
      }
      const body = `Name: ${data.name}\nEmail: ${data.email}\nService: ${data.service}\n\n${data.message}`;
      location.href = `mailto:${cfg.email}?subject=${encodeURIComponent("Project enquiry: " + data.service)}&body=${encodeURIComponent(body)}`;
      say("Your email app should open with the message ready to send.", "ok");
    }
  });
})();
