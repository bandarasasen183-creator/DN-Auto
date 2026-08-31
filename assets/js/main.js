/* DN Auto — shared behavior: header, reveals, transitions, counters, testimonials, DN Assist */
(function () {
  "use strict";

  /* clear enter animation so body doesn't stay a fixed-position containing block */
  document.body.addEventListener("animationend", (event) => {
    if (event.target === document.body && !document.body.classList.contains("page-leaving")) {
      document.body.classList.remove("page-fade");
    }
  });

  /* ---------- header shadow ---------- */
  const header = document.querySelector(".header");
  if (header) {
    window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 8), { passive: true });
  }

  /* ---------- mobile menu ---------- */
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav nav");
  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => navLinks.classList.toggle("mobile-open"));
  }

  /* ---------- page transitions ---------- */
  document.querySelectorAll("a[href$='.html'], a[href='index.html']").forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("http") || link.target === "_blank") return;
      event.preventDefault();
      document.body.classList.add("page-leaving");
      setTimeout(() => { window.location.href = href; }, 240);
    });
  });

  /* ---------- scroll reveal ---------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll("[data-reveal]").forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i % 6, 4) * 60}ms`;
    revealObserver.observe(el);
  });

  /* ---------- animated counters ---------- */
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      counterObserver.unobserve(entry.target);
      const el = entry.target;
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || "";
      const dur = 1400;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll("[data-count]").forEach((el) => counterObserver.observe(el));

  /* ---------- testimonial carousel ---------- */
  const testiShell = document.querySelector(".testi-shell");
  if (testiShell) {
    const slides = testiShell.querySelector(".testi-slides");
    const items = slides.children.length;
    const dotsWrap = testiShell.querySelector(".testi-dots");
    let index = 0;
    for (let i = 0; i < items; i++) {
      const dot = document.createElement("button");
      dot.setAttribute("aria-label", `Review ${i + 1}`);
      dot.addEventListener("click", () => go(i));
      dotsWrap.appendChild(dot);
    }
    const go = (i) => {
      index = (i + items) % items;
      slides.style.transform = `translateX(-${index * 100}%)`;
      dotsWrap.querySelectorAll("button").forEach((d, di) => d.classList.toggle("active", di === index));
    };
    testiShell.querySelector(".testi-nav.prev").addEventListener("click", () => go(index - 1));
    testiShell.querySelector(".testi-nav.next").addEventListener("click", () => go(index + 1));
    let auto = setInterval(() => go(index + 1), 6000);
    testiShell.addEventListener("pointerenter", () => clearInterval(auto));
    testiShell.addEventListener("pointerleave", () => { auto = setInterval(() => go(index + 1), 6000); });
    go(0);
  }

  /* ---------- toast ---------- */
  window.dnToast = function (text) {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove("show"), 3200);
  };

  /* ==================================================================
     DN Assist — chat + voice + forms + history
  ================================================================== */
  const KB = [
    { keys: ["engine", "warning", "light", "check engine", "misfire", "rough"], reply: "A warning light or rough running usually needs an engine diagnostic scan first. We read the fault codes, explain the finding in plain language, and only start the repair after you approve the quote. Want to book a diagnostic slot?" },
    { keys: ["battery", "start", "starting", "alternator", "electrical", "won't start", "crank"], reply: "Starting or charging trouble is usually the battery, starter, or alternator. We test all three during an electrical check so you only replace what's actually faulty. You can pick 'Electrical & battery' when booking." },
    { keys: ["brake", "brakes", "squeal", "grinding", "vibration", "suspension", "noise"], reply: "Brake noise or vibration is a safety item — please don't delay it. Our brake & suspension inspection covers pads, discs, fluid and the suspension components. Book it under 'Brake & suspension check'." },
    { keys: ["oil", "service", "maintenance", "filter", "routine", "general"], reply: "Regular servicing keeps repair costs down over the life of your car. A general service covers oil, filters, fluids and a multi-point check. Sundays 8 AM – 5 PM are our main service hours." },
    { keys: ["price", "cost", "how much", "charge", "quote", "lkr"], reply: "We work with transparent LKR pricing: you get a written quote after diagnosis and no work begins until you approve it. Exact prices depend on your vehicle and parts, so the quickest route is a booking + diagnosis." },
    { keys: ["hour", "open", "time", "sunday", "saturday", "when"], reply: "Business hours: Sunday 8:00 AM – 5:00 PM. Monday–Friday we handle emergency repairs only, from 6:00 PM, for existing customers. Saturday we're closed." },
    { keys: ["where", "location", "address", "kadawatha", "map", "find"], reply: "We're on Church Rd, Kadawatha 11850, Sri Lanka — convenient for anyone around Kadawatha and the Gampaha district. There's an 'Open in Google Maps' link on our Contact page." },
    { keys: ["warranty", "guarantee", "parts"], reply: "Every part we install is genuine and covered by a 6-month or longer warranty. If a part we fitted fails within warranty, bring the car in and we'll make it right." },
    { keys: ["ac", "a/c", "air con", "tyre", "tire", "alignment", "balancing", "diesel"], reply: "Just so you know our scope: we focus on petrol vehicles and mechanical repairs. We currently do not offer A/C repair, wheel alignment, balancing, tyre fitting, or diesel servicing." },
    { keys: ["book", "booking", "appointment", "reserve", "slot"], reply: "Booking takes about two minutes: choose the service, tell us about your vehicle, and pick a day and time. I can take you straight there — tap 'Open booking' below or use the Book a repair button." },
    { keys: ["pay", "payment", "koko", "webxpay", "card", "installment"], reply: "Today you pay at the workshop. Online payments via WEBXPAY and Koko installments are planned for the customer portal — they'll appear here as soon as they're live." },
    { keys: ["hello", "hi", "hey", "ayubowan"], reply: "Hi! I'm DN Assist. Tell me what your car is doing — a light on the dash, a noise, starting trouble — and I'll point you to the right next step." },
    { keys: ["thank", "thanks", "great", "cool"], reply: "You're welcome! If anything else comes up with the car, I'm right here. Safe driving!" },
  ];
  const FALLBACK = "I want to make sure you get an accurate answer, so a service advisor will confirm the details when you book. Meanwhile: I can help with symptoms, services, prices, hours, our location, and warranty questions.";

  function assistReply(text) {
    const t = text.toLowerCase();
    let best = null, bestScore = 0;
    KB.forEach((item) => {
      const score = item.keys.reduce((s, k) => s + (t.includes(k) ? 1 : 0), 0);
      if (score > bestScore) { bestScore = score; best = item; }
    });
    return best ? best.reply : FALLBACK;
  }

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem("dn-assist-history") || "[]"); } catch { return []; }
  }
  function saveHistory(list) { localStorage.setItem("dn-assist-history", JSON.stringify(list.slice(-30))); }

  function buildAssist() {
    const fab = document.createElement("button");
    fab.className = "assist-fab";
    fab.innerHTML = `<span class="fab-avatar">✦</span><span><b>DN Assist</b><small>Chat · Voice · History</small></span>`;
    const panel = document.createElement("div");
    panel.className = "assist-panel";
    panel.innerHTML = `
      <div class="assist-head">
        <span class="a-avatar">✦</span>
        <span><b>DN Assist</b><small><i class="live"></i> Online · usually replies instantly</small></span>
        <button class="a-close" aria-label="Close assistant">×</button>
      </div>
      <div class="assist-tabs">
        <button class="active" data-aview="chat"><span>💬</span>Chat</button>
        <button data-aview="voice"><span>🎙</span>Voice</button>
        <button data-aview="forms"><span>📋</span>Forms</button>
        <button data-aview="history"><span>🕘</span>History</button>
      </div>
      <div class="assist-view active" data-view="chat">
        <div class="assist-msgs"></div>
        <form class="assist-input"><input type="text" placeholder="Ask about a repair..." aria-label="Message DN Assist" /><button type="submit" aria-label="Send">↑</button></form>
      </div>
      <div class="assist-view voice-view" data-view="voice">
        <div class="voice-orb">🎙</div>
        <div class="voice-bars"><i></i><i></i><i></i><i></i><i></i></div>
        <p class="voice-status">Tap the mic and ask about your repair out loud.</p>
        <button class="btn small orange" data-voice-toggle>Start voice chat</button>
      </div>
      <div class="assist-view list-view" data-view="forms">
        <button class="list-item" data-assist-go="booking.html"><span class="li-icon">🔧</span><span><strong>Book a service</strong><small>Choose a service, day and time</small></span></button>
        <button class="list-item" data-assist-go="contact.html#feedback"><span class="li-icon">⭐</span><span><strong>Give us feedback</strong><small>Tell us how your last visit went</small></span></button>
        <button class="list-item" data-assist-go="contact.html#support"><span class="li-icon">🛟</span><span><strong>Get support</strong><small>Question about an ongoing repair</small></span></button>
        <button class="list-item" data-assist-go="login.html"><span class="li-icon">👤</span><span><strong>Customer portal</strong><small>Log in to track your bookings</small></span></button>
      </div>
      <div class="assist-view list-view" data-view="history"><div class="history-list"></div></div>`;
    document.body.append(fab, panel);

    const msgs = panel.querySelector(".assist-msgs");
    const input = panel.querySelector(".assist-input input");
    const historyList = panel.querySelector(".history-list");

    function addMsg(text, who) {
      const div = document.createElement("div");
      div.className = `msg ${who}`;
      div.textContent = text;
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
      return div;
    }
    function addChips() {
      const wrap = document.createElement("div");
      wrap.className = "chip-row";
      [["Check engine light", "My check engine light is on"], ["Book a repair", "I want to book a repair"], ["Opening hours", "What are your opening hours?"], ["Where are you?", "Where is the workshop located?"]].forEach(([label, q]) => {
        const chip = document.createElement("button");
        chip.className = "chip";
        chip.textContent = label;
        chip.addEventListener("click", () => ask(q));
        wrap.appendChild(chip);
      });
      msgs.appendChild(wrap);
    }
    function renderHistory() {
      const items = loadHistory();
      historyList.innerHTML = "";
      if (!items.length) {
        historyList.innerHTML = `<p class="empty-note">No previous chats yet.<br/>Your conversations are saved on this device.</p>`;
        return;
      }
      [...items].reverse().forEach((item) => {
        const el = document.createElement("button");
        el.className = "list-item";
        el.innerHTML = `<span class="li-icon">💬</span><span><strong></strong><small></small></span>`;
        el.querySelector("strong").textContent = item.q.length > 42 ? item.q.slice(0, 42) + "…" : item.q;
        el.querySelector("small").textContent = new Date(item.at).toLocaleString();
        el.addEventListener("click", () => {
          panel.querySelector("[data-aview='chat']").click();
          ask(item.q, true);
        });
        historyList.appendChild(el);
      });
    }
    function ask(question, skipSave) {
      addMsg(question, "user");
      if (!skipSave) {
        const items = loadHistory();
        items.push({ q: question, at: Date.now() });
        saveHistory(items);
        renderHistory();
      }
      const typing = addMsg("", "bot");
      typing.classList.add("typing");
      typing.innerHTML = "<span></span><span></span><span></span>";
      setTimeout(() => {
        typing.classList.remove("typing");
        typing.textContent = assistReply(question);
        if (/book/i.test(question)) {
          const go = document.createElement("button");
          go.className = "chip";
          go.textContent = "Open booking ↗";
          go.style.marginTop = "4px";
          go.addEventListener("click", () => { window.location.href = "booking.html"; });
          msgs.appendChild(go);
        }
        msgs.scrollTop = msgs.scrollHeight;
      }, 700 + Math.random() * 500);
    }

    addMsg("Hi, I'm DN Assist — the DN Auto helper. Tell me what your car is doing and I'll point you to the right next step.", "bot");
    addChips();
    renderHistory();

    fab.addEventListener("click", () => panel.classList.toggle("open"));
    panel.querySelector(".a-close").addEventListener("click", () => panel.classList.remove("open"));
    panel.querySelectorAll("[data-aview]").forEach((tab) => tab.addEventListener("click", () => {
      panel.querySelectorAll("[data-aview]").forEach((t) => t.classList.toggle("active", t === tab));
      panel.querySelectorAll(".assist-view").forEach((v) => v.classList.toggle("active", v.dataset.view === tab.dataset.aview));
    }));
    panel.querySelector(".assist-input").addEventListener("submit", (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      ask(text);
    });
    panel.querySelectorAll("[data-assist-go]").forEach((b) => b.addEventListener("click", () => { window.location.href = b.dataset.assistGo; }));

    /* voice — uses Web Speech API when available, graceful demo otherwise */
    const orb = panel.querySelector(".voice-orb");
    const bars = panel.querySelector(".voice-bars");
    const voiceStatus = panel.querySelector(".voice-status");
    const voiceBtn = panel.querySelector("[data-voice-toggle]");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognizing = false, recognition = null;
    function speak(text) {
      if (!window.speechSynthesis) return;
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.02;
      speechSynthesis.cancel();
      speechSynthesis.speak(utter);
    }
    function stopVoice() {
      recognizing = false;
      orb.classList.remove("listening");
      bars.classList.remove("on");
      voiceBtn.textContent = "Start voice chat";
      if (recognition) recognition.stop();
    }
    voiceBtn.addEventListener("click", () => {
      if (recognizing) { stopVoice(); return; }
      recognizing = true;
      orb.classList.add("listening");
      bars.classList.add("on");
      voiceBtn.textContent = "Stop";
      if (SR) {
        recognition = new SR();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        voiceStatus.textContent = "Listening… describe what your car is doing.";
        recognition.onresult = (event) => {
          const text = event.results[0][0].transcript;
          voiceStatus.textContent = `You said: “${text}”`;
          const reply = assistReply(text);
          setTimeout(() => { voiceStatus.textContent = reply; speak(reply); }, 500);
          const items = loadHistory();
          items.push({ q: text, at: Date.now() });
          saveHistory(items);
          renderHistory();
          stopVoice();
        };
        recognition.onerror = () => { voiceStatus.textContent = "Couldn't access the microphone here — try the Chat tab instead."; stopVoice(); };
        recognition.onend = () => { if (recognizing) stopVoice(); };
        recognition.start();
      } else {
        voiceStatus.textContent = "Voice needs microphone support in your browser. In the full portal this will talk to you — try the Chat tab meanwhile.";
        setTimeout(stopVoice, 2600);
      }
    });
  }

  if (!document.body.classList.contains("no-assist")) buildAssist();
})();
