/* ==========================================================================
   Multi-Doctor Appointment Conflict Scheduler - Global App Controller
   Navbar Injection, Toast System, Modal Helpers & Global DOM Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  AppController.initNavbar();
});

const AppController = {
  /**
   * Renders and manages the dynamic header navbar
   */
  initNavbar() {
    const navContainer = document.querySelector('.navbar');
    if (!navContainer) return;

    const loggedInUser = DataStore.getLoggedInUser();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    let navLinksHtml = '';
    let authNavHtml = '';

    if (loggedInUser) {
      const isDoctor = loggedInUser.role === 'doctor';
      const dashboardLink = isDoctor ? 'doctor-dashboard.html' : 'patient-dashboard.html';

      navLinksHtml = `
        <ul class="nav-links" id="navLinks">
          <li><a href="index.html" class="nav-link ${currentPage === 'index.html' ? 'active' : ''}">Home</a></li>
          <li><a href="${dashboardLink}" class="nav-link ${currentPage.includes('dashboard') ? 'active' : ''}">Dashboard</a></li>
          ${!isDoctor ? `<li><a href="book-appointment.html" class="nav-link ${currentPage === 'book-appointment.html' ? 'active' : ''}">Book Appointment</a></li>` : ''}
          <li><a href="appointments.html" class="nav-link ${currentPage === 'appointments.html' ? 'active' : ''}">My Appointments</a></li>
          <li><a href="reviews.html" class="nav-link ${currentPage === 'reviews.html' ? 'active' : ''}">Doctor Reviews</a></li>
        </ul>
      `;

      authNavHtml = `
        <div class="user-badge-dropdown" id="userDropdownBtn">
          <div class="user-badge">
            <div class="user-avatar">${loggedInUser.name.charAt(0).toUpperCase()}</div>
            <span>${loggedInUser.name}</span>
            <small style="opacity: 0.7;">(${loggedInUser.role})</small>
            <i class="fas fa-chevron-down" style="font-size: 0.75rem;"></i>
          </div>
          <div class="user-dropdown-menu" id="userDropdownMenu">
            <a href="profile.html" class="dropdown-item"><i class="fas fa-user-circle"></i> My Profile</a>
            <a href="${dashboardLink}" class="dropdown-item"><i class="fas fa-columns"></i> Dashboard</a>
            <a href="appointments.html" class="dropdown-item"><i class="fas fa-calendar-alt"></i> Appointments</a>
            <div style="height: 1px; background: var(--border-color); margin: 0.4rem 0;"></div>
            <a href="#" class="dropdown-item" id="logoutBtn" style="color: #ef4444;"><i class="fas fa-sign-out-alt"></i> Logout</a>
          </div>
        </div>
      `;
    } else {
      navLinksHtml = `
        <ul class="nav-links" id="navLinks">
          <li><a href="index.html" class="nav-link ${currentPage === 'index.html' ? 'active' : ''}">Home</a></li>
          <li><a href="reviews.html" class="nav-link ${currentPage === 'reviews.html' ? 'active' : ''}">Doctors & Reviews</a></li>
        </ul>
      `;

      authNavHtml = `
        <div class="nav-auth">
          <a href="login.html" class="btn btn-outline btn-sm">Login</a>
          <a href="signup.html" class="btn btn-primary btn-sm">Sign Up</a>
        </div>
      `;
    }

    navContainer.innerHTML = `
      <div class="nav-container">
        <a href="index.html" class="brand-logo">
          <div class="brand-icon"><i class="fas fa-hospital-user"></i></div>
          <span>MediScheduler</span>
        </a>
        ${navLinksHtml}
        <div style="display: flex; align-items: center; gap: 1rem;">
          ${authNavHtml}
          <button class="mobile-nav-toggle" id="mobileToggle">
            <i class="fas fa-bars"></i>
          </button>
        </div>
      </div>
    `;

    // Dropdown Toggle Listener
    const dropdownBtn = document.getElementById('userDropdownBtn');
    const dropdownMenu = document.getElementById('userDropdownMenu');
    if (dropdownBtn && dropdownMenu) {
      dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
      });

      document.addEventListener('click', () => {
        dropdownMenu.classList.remove('show');
      });
    }

    // Logout Listener
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        AuthModule.logout();
      });
    }

    // Mobile Navigation Toggle
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    if (mobileToggle && navLinks) {
      mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('show');
      });
    }
  },

  /**
   * Displays an animated Toast message
   */
  showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';

    toast.innerHTML = `
      <i class="fas ${icon}" style="font-size: 1.2rem;"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};
