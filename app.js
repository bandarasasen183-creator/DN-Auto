const modal = document.querySelector("#booking-modal");
const form = document.querySelector("#booking-form");
const success = document.querySelector("#form-success");

function openBooking() {
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeBooking() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.querySelectorAll("[data-open-booking]").forEach((button) => {
  button.addEventListener("click", openBooking);
});
document.querySelector("[data-close-booking]").addEventListener("click", closeBooking);
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeBooking();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("open")) closeBooking();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  form.closest(".booking-modal").classList.add("success");
  success.classList.add("show");
  setTimeout(() => {
    form.closest(".booking-modal").classList.remove("success");
    success.classList.remove("show");
    form.reset();
    closeBooking();
  }, 4200);
});

const dashboardContent = document.querySelector("#dashboard-content");
const dashboardTitle = document.querySelector("#dash-title");
const portalData = {
  customer: {
    title: "Customer portal",
    html: `<div class="dash-welcome"><span>Good morning, Anushka</span><strong>Your next repair</strong></div>
      <div class="booking-status"><div class="status-icon">↗</div><div><small>BOOKING DN-1042 · 24 SEP 2026</small><strong>Engine diagnostics</strong><span class="status-pill">Confirmed</span></div><span class="dash-arrow">→</span></div>
      <div class="dash-columns"><div><small>YOUR VEHICLES</small><strong>Honda Fit · WP CAB-1234</strong></div><div><small>RECENT ACTIVITY</small><strong>Quote approved · LKR 18,500</strong></div></div>`,
  },
  worker: {
    title: "Worker portal",
    html: `<div class="dash-welcome"><span>Tuesday, 24 September</span><strong>Your workshop board</strong></div>
      <div class="booking-status"><div class="status-icon">✓</div><div><small>JOB DN-1042 · BAY 02</small><strong>Honda Fit · Engine diagnostics</strong><span class="status-pill">In progress</span></div><span class="dash-arrow">→</span></div>
      <div class="dash-columns"><div><small>TODAY'S JOBS</small><strong>4 bookings · 2 awaiting approval</strong></div><div><small>PAY SUMMARY</small><strong>September · LKR 86,400</strong></div></div>`,
  },
  admin: {
    title: "Admin portal",
    html: `<div class="dash-welcome"><span>DN Auto operations</span><strong>Today's overview</strong></div>
      <div class="booking-status"><div class="status-icon">↗</div><div><small>LIVE WORKSHOP STATUS</small><strong>12 bookings · 7 active jobs</strong><span class="status-pill">On track</span></div><span class="dash-arrow">→</span></div>
      <div class="dash-columns"><div><small>REVENUE THIS MONTH</small><strong>LKR 1,248,500</strong></div><div><small>PAYMENTS</small><strong>WEBXPAY / Koko ready</strong></div></div>`,
  },
};

document.querySelectorAll("[data-portal]").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("[data-portal]").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    const selected = portalData[tab.dataset.portal];
    dashboardTitle.textContent = selected.title;
    dashboardContent.innerHTML = selected.html;
  });
});
