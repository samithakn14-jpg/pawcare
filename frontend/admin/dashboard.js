(() => {
  const tbody = document.getElementById('applicationsBody');
  const notice = document.getElementById('dashboardNotice');
  const filter = document.getElementById('applicationFilter');
  const statsTargets = {
    pets: document.getElementById('totalPets'),
    available_pets: document.getElementById('availablePets'),
    adoption_applications: document.getElementById('totalApplications'),
    pending_applications: document.getElementById('pendingApplications'),
    users: document.getElementById('registeredUsers')
  };
  const statusLabels = {
    pending: ['Pending', 'text-bg-warning'],
    under_review: ['Under review', 'text-bg-info'],
    approved: ['Approved', 'text-bg-success'],
    rejected: ['Rejected', 'text-bg-danger'],
    cancelled: ['Cancelled', 'text-bg-secondary']
  };
  let busyApplication = null;

  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  function showNotice(message, kind = 'danger') {
    notice.textContent = message;
    notice.className = `alert alert-${kind} notice`;
  }

  function renderApplications(applications) {
    if (!applications.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-secondary">No applications in this view.</td></tr>';
      return;
    }

    tbody.innerHTML = applications.map(application => {
      const status = statusLabels[application.status] || statusLabels.pending;
      const applicant = application.users || {};
      const pet = application.pets || {};
      const date = application.application_date
        ? new Date(application.application_date).toLocaleDateString()
        : '—';
      const canReview = ['pending', 'under_review'].includes(application.status);
      const actionDisabled = busyApplication === application.id;
      return `<tr>
        <td><strong>${escapeHTML(applicant.full_name || application.full_name || 'Applicant')}</strong><br>
          <span class="small text-secondary">${escapeHTML(applicant.email || application.email || '')}</span><br>
          <span class="small text-secondary">${escapeHTML(applicant.phone || application.phone || '')}</span><br>
          <span class="small text-secondary">${escapeHTML(application.address || '')}</span>
        </td>
        <td><strong>${escapeHTML(pet.name || 'Pet listing unavailable')}</strong><br>
          <span class="small text-secondary">${escapeHTML([pet.breed, pet.species].filter(Boolean).join(' · '))}</span>
        </td>
        <td><span class="small text-secondary">${escapeHTML(date)}</span><br>
          <span class="app-reason d-inline-block small" title="${escapeHTML(application.reason || '')}">${escapeHTML(application.reason || 'No reason provided')}</span><br>
          <span class="small text-secondary">Experience: ${escapeHTML(application.pet_experience || 'Not provided')}</span>
        </td>
        <td><span class="badge ${status[1]}">${status[0]}</span></td>
        <td class="text-end text-nowrap">${canReview
          ? `<button type="button" class="btn btn-sm btn-success mb-1" data-application-action="approved" data-application-id="${escapeHTML(application.id)}" ${actionDisabled ? 'disabled' : ''}>Approve</button>
             <button type="button" class="btn btn-sm btn-outline-danger mb-1" data-application-action="rejected" data-application-id="${escapeHTML(application.id)}" ${actionDisabled ? 'disabled' : ''}>Reject</button>`
          : '<span class="small text-secondary">Reviewed</span>'}</td>
      </tr>`;
    }).join('');
  }

  async function loadDashboard() {
    const refresh = document.getElementById('refreshDashboard');
    refresh.disabled = true;
    notice.textContent = '';
    notice.className = 'alert notice';
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Loading applications…</td></tr>';
    try {
      const status = filter.value ? `?status=${encodeURIComponent(filter.value)}&limit=100` : '?limit=100';
      const [statsResponse, applicationsResponse] = await Promise.all([
        window.AdminPortal.request('/stats'),
        window.AdminPortal.request(`/applications${status}`)
      ]);
      const stats = statsResponse.data;
      Object.entries(statsTargets).forEach(([key, target]) => {
        target.textContent = Number(stats[key] || 0).toLocaleString();
      });
      renderApplications(applicationsResponse.data || []);
    } catch (error) {
      console.error('Admin dashboard load failed:', error);
      showNotice(error.message);
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Applications could not be loaded.</td></tr>';
    } finally {
      refresh.disabled = false;
    }
  }

  tbody.addEventListener('click', async event => {
    const button = event.target.closest('[data-application-action]');
    if (!button || busyApplication) return;
    const status = button.dataset.applicationAction;
    if (!window.confirm(`Are you sure you want to ${status} this adoption application?`)) return;
    busyApplication = button.dataset.applicationId;
    button.disabled = true;
    showNotice(`${status === 'approved' ? 'Approving' : 'Rejecting'} application…`, 'info');
    try {
      await window.AdminPortal.request(`/applications/${encodeURIComponent(busyApplication)}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      busyApplication = null;
      await loadDashboard();
      showNotice(`Application ${status} successfully.`, 'success');
    } catch (error) {
      console.error('Application review failed:', error);
      showNotice(error.message);
      busyApplication = null;
      button.disabled = false;
    }
  });

  document.getElementById('refreshDashboard').addEventListener('click', loadDashboard);
  filter.addEventListener('change', loadDashboard);
  document.addEventListener('DOMContentLoaded', async () => {
    if (await window.AdminPortal.authorize()) await loadDashboard();
  });
})();
