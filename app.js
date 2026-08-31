const modal = document.querySelector("#booking-modal");
const steps = [...document.querySelectorAll(".booking-step")];
const progress = [...document.querySelectorAll(".modal-progress span")];
const screen = document.querySelector("#portal-screen");
let currentStep = 1;
let chosenService = "Engine diagnostics & repair";

const portals = {
  customer: {
    name: "Customer portal",
    greeting: "Good morning, Anushka",
    title: "Your repair overview",
    stats: [["NEXT VISIT", "24 Sep"], ["STATUS", "Confirmed"], ["VEHICLE", "Honda Fit"]],
    jobs: [["DN-1042", "Engine diagnostics", "Confirmed"], ["DN-0988", "Brake inspection", "Completed"]],
    footer: "Payments: ready for WEBXPAY / Koko",
  },
  worker: {
    name: "Worker portal",
    greeting: "Tuesday, 24 September",
    title: "Your workshop board",
    stats: [["TODAY'S JOBS", "04", ["2 awaiting approval"]], ["ACTIVE BAYS", "03"], ["PAY PERIOD", "September"]],
    jobs: [["BAY 02", "Honda Fit · Diagnostics", "In progress"], ["BAY 04", "Toyota Aqua · Brakes", "Ready"], ["BAY 01", "Suzuki Wagon R · Service", "Queued"]],
    footer: "Pay summary: LKR 86,400 · View payslips",
  },
  admin: {
    name: "Admin portal",
    greeting: "DN Auto operations",
    title: "Today's overview",
    stats: [["BOOKINGS", "12"], ["ACTIVE JOBS", "07"], ["MONTH REVENUE", "LKR 1.24M"]],
    jobs: [["DN-1042", "Honda Fit · Engine diagnostics", "Assigned"], ["DN-1041", "Toyota Aqua · Battery check", "Awaiting quote"], ["DN-1038", "Suzuki Swift · Inspection", "Ready"]],
    footer: "Payments: WEBXPAY / Koko connected in production",
  },
};

function openBooking() {
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeBooking() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  currentStep = 1;
  setStep(1);
  modal.querySelector(".booking-modal").classList.remove("success");
}

function setStep(step) {
  currentStep = step;
  steps.forEach((item) => item.classList.toggle("active", Number(item.dataset.step) === step));
  progress.forEach((item, index) => item.classList.toggle("active", index < step));
}

function renderPortal(role = "customer") {
  const portal = portals[role];
  screen.innerHTML = `<div class="screen-top"><div class="screen-brand"><span class="mini-logo">DN</span>${portal.name}</div><span class="screen-profile">AM&nbsp;&nbsp;⌄</span></div>
    <div class="screen-body"><small>${portal.greeting}</small><h3>${portal.title}</h3>
    <div class="screen-stats">${portal.stats.map(([label, value]) => `<div class="stat-card ${label === "STATUS" ? "highlight" : ""}"><small>${label}</small><strong>${value}</strong></div>`).join("")}</div>
    <div class="job-list">${portal.jobs.map(([id, job, status]) => `<div class="job-row"><span><strong>${job}</strong><small>${id}</small></span><span class="pill">${status}</span><span>→</span></div>`).join("")}</div>
    <div class="screen-foot"><i class="live"></i> ${portal.footer}</div></div>`;
}

document.querySelectorAll("[data-open-booking]").forEach((button) => button.addEventListener("click", openBooking));
document.querySelectorAll("[data-close-booking]").forEach((button) => button.addEventListener("click", closeBooking));
document.querySelectorAll("[data-service-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    chosenService = button.dataset.serviceChoice;
    document.querySelectorAll("[data-service-choice]").forEach((item) => item.classList.toggle("selected", item === button));
  });
});
document.querySelectorAll("[data-next-step]").forEach((button) => button.addEventListener("click", () => {
  if (currentStep === 2) {
    const vehicle = modal.querySelector("[name=vehicle]").value || "Add your vehicle";
    const date = modal.querySelector("[name=date]").value;
    document.querySelector("#summary-service").textContent = chosenService;
    document.querySelector("#summary-vehicle").textContent = vehicle;
    document.querySelector("#summary-date").textContent = date || "We'll confirm with you";
  }
  setStep(Math.min(3, currentStep + 1));
}));
document.querySelectorAll("[data-prev-step]").forEach((button) => button.addEventListener("click", () => setStep(Math.max(1, currentStep - 1))));
document.querySelector("[data-submit-booking]").addEventListener("click", () => modal.querySelector(".booking-modal").classList.add("success"));
modal.addEventListener("click", (event) => { if (event.target === modal) closeBooking(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && modal.classList.contains("open")) closeBooking(); });

document.querySelectorAll("[data-portal]").forEach((tab) => tab.addEventListener("click", () => {
  document.querySelectorAll("[data-portal]").forEach((item) => item.classList.toggle("active", item === tab));
  renderPortal(tab.dataset.portal);
}));

document.querySelectorAll("[data-show-portal]").forEach((button) => button.addEventListener("click", (event) => {
  event.preventDefault();
  document.querySelector("#portal-preview").scrollIntoView({ behavior: "smooth" });
  const target = document.querySelector(`[data-portal="${button.dataset.showPortal}"]`);
  if (target) target.click();
}));

document.querySelector(".menu").addEventListener("click", () => {
  document.querySelector(".nav nav").classList.toggle("mobile-open");
});

const assistant = document.querySelector(".assistant-widget");
const assistantToggle = document.querySelector(".assistant-toggle");
const assistantClose = document.querySelector(".assistant-close");
const assistantMessages = document.querySelector("#assistant-messages");
const assistantForm = document.querySelector("#assistant-form");
const assistantInput = document.querySelector("#assistant-input");

const assistantReplies = [
  ["check engine", "A warning light can have several causes. We can start with an engine diagnostic scan, then explain the finding before any repair is approved."],
  ["book", "I can help you request a visit. Choose a service, add your vehicle details, and DN Auto will confirm the time with you."],
  ["located", "DN Auto is on Church Rd, Kadawatha 11850. Use the map link in the Visit section for directions."],
  ["price", "Prices depend on the vehicle and the fault found. The service cards show starting points; you’ll receive a clear quote before repair work begins."],
  ["ac", "DN Auto’s current scope is petrol-vehicle repair—not A/C, wheel alignment, balancing, or tyre fitting."],
];

function addAssistantMessage(text, type) {
  const message = document.createElement("div");
  message.className = `assistant-message ${type}`;
  message.textContent = text;
  assistantMessages.append(message);
  assistantMessages.scrollTop = assistantMessages.scrollHeight;
}

function assistantAnswer(question) {
  const normalized = question.toLowerCase();
  const match = assistantReplies.find(([keyword]) => normalized.includes(keyword));
  return match ? match[1] : "I can help with repair categories, booking requests, workshop location, starting prices, and what DN Auto does not service.";
}

function askAssistant(question) {
  const trimmed = question.trim();
  if (!trimmed) return;
  addAssistantMessage(trimmed, "user");
  window.setTimeout(() => addAssistantMessage(assistantAnswer(trimmed), "bot"), 180);
  assistantInput.value = "";
}

assistantToggle.addEventListener("click", () => {
  const isOpen = assistant.classList.toggle("open");
  assistantToggle.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) assistantInput.focus();
});
assistantClose.addEventListener("click", () => {
  assistant.classList.remove("open");
  assistantToggle.setAttribute("aria-expanded", "false");
});
assistantForm.addEventListener("submit", (event) => {
  event.preventDefault();
  askAssistant(assistantInput.value);
});
document.querySelectorAll("[data-assistant-prompt]").forEach((button) => {
  button.addEventListener("click", () => askAssistant(button.dataset.assistantPrompt));
});

renderPortal();
