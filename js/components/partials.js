function loadPartial(id, file) {
  return fetch(file)
    .then(response => {
      if (!response.ok) throw new Error(`Could not load ${file}`);
      return response.text();
    })
    .then(data => {
      document.getElementById(id).innerHTML = data;
    });
}

document.addEventListener("DOMContentLoaded", () => {
  loadPartial("head-placeholder", "/components/head.html").then(() => {
    Promise.all([
      loadPartial("announcement-placeholder", "/components/announcement.html"),
      loadPartial("header-placeholder", "/components/header.html"),
      loadPartial("nav-placeholder", "/components/nav.html"),
      loadPartial("footer-placeholder", "/components/footer.html")
    ]).then(() => {
      setupAnnouncement();

      /* ===== DARK / LIGHT TOGGLE ===== */
      const toggleBtn = document.getElementById("darkModeToggle");
      if (toggleBtn) {
        const savedTheme = localStorage.getItem("theme") || "light";
        document.documentElement.setAttribute("data-theme", savedTheme);
        toggleBtn.textContent = savedTheme === "dark" ? "☀️" : "🌙";

        toggleBtn.addEventListener("click", () => {
          const current = document.documentElement.getAttribute("data-theme");
          const newTheme = current === "dark" ? "light" : "dark";
          document.documentElement.setAttribute("data-theme", newTheme);
          localStorage.setItem("theme", newTheme);
          toggleBtn.textContent = newTheme === "dark" ? "☀️" : "🌙";

          // Notify other parts of the app about theme change
          window.dispatchEvent(new Event('themechange'));
        });
      }

      /* ===== HAMBURGER MENU TOGGLE ===== */
      const navToggle = document.getElementById("navToggle");
      const navMenu = document.getElementById("navMenu");

      if (navToggle && navMenu) {
        navToggle.addEventListener("click", () => {
          navMenu.classList.toggle("show");
        });
      }
    });
  });
});

function setupAnnouncement() {
  const announcement = document.getElementById('announcement');
  const title = document.getElementById('announcement-title');
  const message = document.getElementById('announcement-message');
  const marquee = document.getElementById('announcement-marquee');
  const path = window.location.pathname;
  const announcements = {
    /*
    '/': { // ALL PADGES
      title: '',
      message: '',
      marquee: ''
    },*/
    '/pages/builders/uniformBuilder.html': {
      title: 'Warning:',
      message: 'This is a draft uniform creator. Please use extra caution as placements and tolerances may be inaccurate and not fully compliant with CAPR 39-1 uniform standards.',
      marquee: 'This tool is a work in progress — verify All uniform details carefully!'
    },
    '/pages/uniforms/faq.html': {
      title: 'Update:',
      message: 'Civil Air Patrol has approved OCP (Operational Camouflage Pattern) for wear as a uniform, which was authorized starting November 1, 2025. Regulations require specific OCP material, a place for a name tape on the back, and appropriate insignia.',
      marquee: 'In accordance with DAFI 36-2903 except where noted otherwise in CAPR 39-1.'
    }
  };

  const current = announcements[path] || announcements['/'] || null;
  console.log('Announcement for this page:', current);

  if (current && announcement) {
    title.textContent = current.title;
    message.textContent = current.message;

    if (current.marquee) {
      marquee.textContent = current.marquee;
      marquee.style.display = 'inline-block';
    } else {
      marquee.style.display = 'none';
    }

    announcement.style.display = 'block';
  }
}