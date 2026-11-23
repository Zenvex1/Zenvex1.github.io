/* ZYRIX CLIENT — interactions: navigation, reveal, lightbox, parallax, copy. */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  /* Year ---------------------------------------------------------------- */
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* Release metadata ---------------------------------------------------- */
  const versionChip = $("#versionChip");
  const downloadVersion = $("#downloadVersion");
  const downloadSize = $("#downloadSize");
  const downloadLink = $("#downloadLink");
  const sha256 = $("#sha256");
  fetch("updates/latest.json", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((release) => {
      if (!release || !release.version) return;
      if (versionChip) versionChip.textContent = "v" + release.version;
      if (downloadVersion) downloadVersion.textContent = release.version;
      $$(".status").forEach((element) => {
        if (element.textContent.trim().startsWith("Version ")) {
          element.innerHTML = '<i class="dot mint"></i> Version ' + release.version;
        }
      });
      const installer = release.installer;
      if (installer) {
        if (downloadLink && installer.url) {
          downloadLink.href = new URL(installer.url,
            new URL("updates/latest.json", window.location.href)).href;
        }
        if (downloadSize && installer.size) {
          downloadSize.textContent = (installer.size / 1048576)
            .toFixed(1).replace(".", ",") + " MB";
        }
        if (sha256 && installer.sha256) {
          sha256.textContent = installer.sha256.toUpperCase();
        }
      }
    })
    .catch(() => { /* Offline: the checked-in values remain visible. */ });

  /* Header state -------------------------------------------------------- */
  const header = $(".site-header");
  const onScroll = () => {
    if (header) header.classList.toggle("scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Mobile navigation --------------------------------------------------- */
  const nav = $("#nav");
  const toggle = $("#menuToggle");
  const closeNav = () => {
    if (!nav || !toggle) return;
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Menü öffnen");
    document.body.classList.remove("no-scroll");
  };

  if (nav && toggle) {
    toggle.addEventListener("click", () => {
      const open = !nav.classList.contains("open");
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
      document.body.classList.toggle("no-scroll", open);
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeNav();
    });

    document.addEventListener("click", (event) => {
      if (!nav.classList.contains("open")) return;
      if (nav.contains(event.target) || toggle.contains(event.target)) return;
      closeNav();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeNav();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) closeNav();
    });
  }

  /* Reveal on scroll ---------------------------------------------------- */
  const revealItems = $$(".reveal");
  if (!reduceMotion && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("in");
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    for (const item of revealItems) observer.observe(item);
  } else {
    for (const item of revealItems) item.classList.add("in");
  }

  /* Card spotlight ------------------------------------------------------ */
  if (!reduceMotion) {
    for (const card of $$(".card")) {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        card.style.setProperty("--my", `${event.clientY - rect.top}px`);
      });
    }
  }

  /* Hero parallax ------------------------------------------------------- */
  const preview = $("#preview");
  const hero = $(".hero-visual");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (preview && hero && finePointer && !reduceMotion) {
    let frame = 0;
    let targetX = 0;
    let targetY = 0;

    hero.addEventListener("pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      targetX = (event.clientX - rect.left) / rect.width - 0.5;
      targetY = (event.clientY - rect.top) / rect.height - 0.5;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (window.innerWidth < 1080) {
          preview.style.transform = "";
          return;
        }
        const rx = -2.4 + targetX * 2.4;
        const ry = 1.2 + targetY * 1.8;
        preview.style.transform =
          `perspective(1200px) rotateY(${rx.toFixed(2)}deg) ` +
          `rotateX(${ry.toFixed(2)}deg) translate3d(${(-targetX * 6).toFixed(1)}px, ` +
          `${(-targetY * 5).toFixed(1)}px, 0)`;
      });
    });

    hero.addEventListener("pointerleave", () => {
      preview.style.transform = "";
    });
  }

  /* Lightbox ------------------------------------------------------------ */
  const lightbox = $("#lightbox");
  const lightboxImage = $("#lightboxImage");
  const lightboxCaption = $("#lightboxCaption");
  const lightboxClose = $("#lightboxClose");
  let lastFocused = null;

  const openLightbox = (button) => {
    if (!lightbox || !lightboxImage) return;
    lastFocused = button;
    lightboxImage.src = button.dataset.full || "";
    lightboxImage.alt = button.dataset.caption || "Screenshot";
    if (lightboxCaption) lightboxCaption.textContent = button.dataset.caption || "";
    lightbox.hidden = false;
    document.body.classList.add("no-scroll");
    requestAnimationFrame(() => lightbox.classList.add("open"));
    if (lightboxClose) lightboxClose.focus();
  };

  const closeLightbox = () => {
    if (!lightbox || lightbox.hidden) return;
    lightbox.classList.remove("open");
    document.body.classList.remove("no-scroll");
    window.setTimeout(() => {
      lightbox.hidden = true;
      lightboxImage.src = "";
      if (lastFocused) lastFocused.focus();
    }, reduceMotion ? 0 : 220);
  };

  for (const button of $$(".shot-open")) {
    button.addEventListener("click", () => openLightbox(button));
  }
  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightbox) {
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox && !lightbox.hidden) closeLightbox();
  });

  /* Copy SHA-256 -------------------------------------------------------- */
  for (const button of $$("[data-copy]")) {
    button.addEventListener("click", async () => {
      const target = $(button.dataset.copy);
      if (!target) return;
      const text = target.textContent.trim();
      try {
        await navigator.clipboard.writeText(text);
        const original = button.textContent;
        button.textContent = "Kopiert";
        button.classList.add("copied");
        window.setTimeout(() => {
          button.textContent = original;
          button.classList.remove("copied");
        }, 1800);
      } catch {
        const range = document.createRange();
        range.selectNodeContents(target);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
  }

  /* Ambient dust -------------------------------------------------------- */
  const dust = $("#dust");
  if (dust && !reduceMotion) {
    const colors = ["", "", "violet", "mint"];
    for (let i = 0; i < 26; i++) {
      const particle = document.createElement("span");
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.setProperty("--dur", `${7 + Math.random() * 9}s`);
      particle.style.setProperty("--delay", `${-Math.random() * 12}s`);
      const color = colors[Math.floor(Math.random() * colors.length)];
      if (color) particle.className = color;
      dust.appendChild(particle);
    }
  }
})();
