/* DN Auto — multi-step booking flow with progress bar */
(function () {
  "use strict";

  const form = document.getElementById("booking-form");
  const steps = [...form.querySelectorAll(".book-step")];
  const fill = document.getElementById("progress-fill");
  const labels = [...document.querySelectorAll("[data-pstep]")];
  const TOTAL = 5;
  let current = 1;
  const state = { customerType: "New customer", service: "General Service", slot: "" };

  /* pre-select service from ?service= query */
  const preset = new URLSearchParams(location.search).get("service");
  if (preset) {
    const match = [...form.querySelectorAll("[data-choice='service']")].find((b) => b.dataset.value === preset);
    if (match) selectChoice(match);
  }

  function selectChoice(button) {
    const group = button.dataset.choice;
    form.querySelectorAll(`[data-choice='${group}']`).forEach((b) => b.classList.toggle("selected", b === button));
    state[group] = button.dataset.value;
  }
  form.querySelectorAll("[data-choice]").forEach((b) => b.addEventListener("click", () => selectChoice(b)));

  /* time slots (Asia/Colombo, Sunday service hours) */
  const slots = ["7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"];
  const slotGrid = document.getElementById("slot-grid");
  slots.forEach((slot) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "slot";
    b.textContent = slot;
    b.addEventListener("click", () => {
      slotGrid.querySelectorAll(".slot").forEach((s) => s.classList.toggle("selected", s === b));
      state.slot = slot;
    });
    slotGrid.appendChild(b);
  });

  /* default date: next Sunday */
  const dateInput = form.querySelector("[name='date']");
  const today = new Date();
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + ((7 - today.getDay()) % 7 || 7));
  dateInput.value = nextSunday.toISOString().slice(0, 10);
  dateInput.min = today.toISOString().slice(0, 10);

  function setStep(step) {
    current = step;
    steps.forEach((s) => s.classList.toggle("active", Number(s.dataset.step) === step));
    const pct = Math.min(1, (step - 1) / (TOTAL - 1)) * 100;
    fill.style.width = `${step > TOTAL ? 100 : pct}%`;
    labels.forEach((l) => l.classList.toggle("done", Number(l.dataset.pstep) <= Math.min(step, TOTAL)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateStep(step) {
    const panel = steps.find((s) => Number(s.dataset.step) === step);
    for (const input of panel.querySelectorAll("input[required]")) {
      if (!input.value.trim()) {
        input.focus();
        input.style.borderColor = "var(--red)";
        setTimeout(() => { input.style.borderColor = ""; }, 1600);
        window.dnToast("Please fill in the required fields to continue.");
        return false;
      }
    }
    if (step === 4 && !state.slot) {
      window.dnToast("Please pick a time slot.");
      return false;
    }
    return true;
  }

  form.querySelectorAll("[data-next]").forEach((b) => b.addEventListener("click", () => {
    if (!validateStep(current)) return;
    if (current === 4) fillSummary();
    setStep(Math.min(6, current + 1));
  }));
  form.querySelectorAll("[data-prev]").forEach((b) => b.addEventListener("click", () => setStep(Math.max(1, current - 1))));

  function fillSummary() {
    const v = (name) => form.querySelector(`[name='${name}']`).value.trim();
    document.getElementById("sum-name").textContent = v("name") || "—";
    document.getElementById("sum-type").textContent = state.customerType;
    document.getElementById("sum-phone").textContent = v("phone") || "—";
    document.getElementById("sum-vehicle").textContent = `${v("vehicle")}${v("rego") ? " · " + v("rego") : ""}`;
    document.getElementById("sum-service").textContent = state.service.replace(/&amp;/g, "&");
    const when = v("date") ? new Date(v("date")).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "—";
    document.getElementById("sum-when").textContent = `${when} · ${state.slot}`;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    /* save booking locally so the portal demo can show it */
    try {
      const bookings = JSON.parse(localStorage.getItem("dn-bookings") || "[]");
      bookings.push({
        id: "DN-" + String(1000 + bookings.length + 43),
        name: form.querySelector("[name='name']").value.trim(),
        vehicle: form.querySelector("[name='vehicle']").value.trim(),
        service: state.service.replace(/&amp;/g, "&"),
        date: form.querySelector("[name='date']").value,
        slot: state.slot,
        status: "Pending confirmation",
        at: Date.now(),
      });
      localStorage.setItem("dn-bookings", JSON.stringify(bookings));
    } catch { /* storage unavailable */ }
    fill.style.width = "100%";
    setStep(6);
  });

  setStep(1);
})();
