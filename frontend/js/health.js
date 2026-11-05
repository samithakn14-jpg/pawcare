(() => {
  const config = window.PAWCARE_CONFIG;
  const providerSelect = document.getElementById('appointmentProvider');
  const petSelect = document.getElementById('appointmentPet');
  const form = document.getElementById('appointmentForm');
  const bookingMessage = document.getElementById('bookingMessage');
  const history = document.getElementById('appointmentHistory');
  const providerCards = document.getElementById('providerCards');
  const selectedProvider = document.getElementById('selectedProvider');
  let providers = [];
  let appointments = [];
  let submitting = false;

  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  function showMessage(element, message, kind = 'danger') {
    element.textContent = message;
    element.className = `alert alert-${kind}`;
    element.hidden = false;
  }

  async function apiRequest(path, options = {}) {
    const { data, error } = await config.supabase.auth.getSession();
    if (error) throw error;
    if (!data.session?.access_token) throw new Error('Your session expired. Please sign in again.');
    const response = await fetch(`${config.API_BASE_URL}/appointments${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${data.session.access_token}`,
        ...(options.headers || {})
      }
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      const validation = result.errors?.map(item => item.msg).filter(Boolean).join(' ');
      throw new Error(result.message || validation || `Request failed (HTTP ${response.status}).`);
    }
    return result;
  }

  async function publicRequest(path) {
    const response = await fetch(`${config.API_BASE_URL}${path}`);
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || `Request failed (HTTP ${response.status}).`);
    return result;
  }

  function renderProviders() {
    providerSelect.innerHTML = '<option value="">Choose a clinic or partner</option>' + providers.map(provider =>
      `<option value="${escapeHTML(provider.id)}">${escapeHTML(provider.name)} — ${escapeHTML(provider.location)}</option>`
    ).join('');
    if (!providers.length) {
      providerSelect.innerHTML = '<option value="">No veterinary partners are configured</option>';
      providerSelect.disabled = true;
    }

    providerCards.innerHTML = providers.length ? providers.map(provider => {
      const services = (provider.services || []).filter(service => /veterinar|vet(?:erinary)?\b|vaccin|animal health|clinic/i.test(service));
      const hours = provider.opening_hours && typeof provider.opening_hours === 'object'
        ? Object.entries(provider.opening_hours).map(([day, time]) =>
          `${day[0].toUpperCase()}${day.slice(1)}: ${time?.open || '—'}–${time?.close || '—'}`
        ).join(' · ')
        : '';
      const website = /^https?:\/\//i.test(provider.website || '') ? provider.website : '';
      return `<article class="provider-card">
        <h3 class="h6 mb-1">${escapeHTML(provider.name)}</h3>
        <p class="small text-secondary mb-2">${escapeHTML([provider.location, provider.address].filter(Boolean).join(' · '))}</p>
        <p class="small mb-2"><strong>Services:</strong> ${escapeHTML(services.join(', '))}</p>
        ${provider.phone ? `<p class="small mb-1"><strong>Phone:</strong> <a href="tel:${escapeHTML(provider.phone)}">${escapeHTML(provider.phone)}</a></p>` : ''}
        ${provider.email ? `<p class="small mb-1"><strong>Email:</strong> <a href="mailto:${escapeHTML(provider.email)}">${escapeHTML(provider.email)}</a></p>` : ''}
        ${website ? `<p class="small mb-1"><a href="${escapeHTML(website)}" target="_blank" rel="noopener noreferrer">Provider website</a></p>` : ''}
        ${hours ? `<p class="small text-secondary mb-0">${escapeHTML(hours)}</p>` : ''}
      </article>`;
    }).join('') : '<p class="portal-muted mb-0">No partners with veterinary services are available yet. Contact the team to request a listing.</p>';
  }

  function updateSelectedProvider() {
    const provider = providers.find(item => item.id === providerSelect.value);
    selectedProvider.textContent = provider
      ? `${provider.verified ? 'Verified partner' : 'Partner listing'} · Contact the clinic directly to confirm your selected slot.`
      : '';
  }

  function formatDate(date, time) {
    const parsed = new Date(`${date}T${String(time || '00:00').slice(0, 5)}`);
    return Number.isNaN(parsed.getTime()) ? `${date} ${time || ''}` : parsed.toLocaleString();
  }

  function renderHistory() {
    if (!appointments.length) {
      history.innerHTML = '<p class="portal-muted mb-0">No appointments yet. Book a visit using the form above.</p>';
      return;
    }
    const labels = {
      pending: ['Pending', 'text-bg-warning'],
      confirmed: ['Confirmed', 'text-bg-success'],
      completed: ['Completed', 'text-bg-primary'],
      cancelled: ['Cancelled', 'text-bg-secondary'],
      no_show: ['No show', 'text-bg-danger']
    };
    history.innerHTML = `<div class="row g-3">${appointments.map(appointment => {
      const status = labels[appointment.status] || labels.pending;
      const canCancel = ['pending', 'confirmed'].includes(appointment.status)
        && new Date(`${appointment.appointment_date}T${String(appointment.appointment_time).slice(0, 8)}`) > new Date();
      return `<div class="col-12"><article class="history-card">
        <div class="d-flex flex-wrap justify-content-between gap-2">
          <div><h3 class="h6 mb-1">${escapeHTML(appointment.pets?.name || appointment.pet_name || 'Pet')}</h3>
            <p class="small text-secondary mb-2">${escapeHTML(appointment.clinic_name || appointment.shelters?.name || 'Clinic')} · ${escapeHTML(formatDate(appointment.appointment_date, appointment.appointment_time))}</p>
          </div><span class="badge ${status[1]} align-self-start">${status[0]}</span>
        </div>
        <p class="small mb-1"><strong>Reason:</strong> ${escapeHTML(appointment.reason)}</p>
        <p class="small text-secondary mb-2">${appointment.veterinarian ? `Veterinarian: ${escapeHTML(appointment.veterinarian)} · ` : ''}${escapeHTML(appointment.notes || '')}</p>
        ${canCancel ? `<button type="button" class="btn btn-sm btn-outline-danger" data-cancel-appointment="${escapeHTML(appointment.id)}">Cancel appointment</button>` : ''}
      </article></div>`;
    }).join('')}</div>`;
  }

  async function loadHistory() {
    history.innerHTML = '<p class="text-secondary" role="status"><span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Loading your appointments…</p>';
    try {
      const result = await apiRequest('?limit=100');
      appointments = result.data || [];
      renderHistory();
    } catch (error) {
      console.error('Appointment history could not be loaded:', error);
      history.innerHTML = `<p class="text-danger mb-0">${escapeHTML(error.message)}</p>`;
    }
  }

  async function initialize() {
    const status = document.getElementById('healthStatus');
    if (!config?.supabase || !window.PawCareAuth) {
      showMessage(status, 'Health appointments require a configured Supabase connection.');
      return;
    }
    try {
      const user = await window.PawCareAuth.requireAuth();
      if (!user) return;
      status.hidden = true;
      const [petsResult, providersResult] = await Promise.all([
        publicRequest('/pets?limit=100'),
        publicRequest('/appointments/providers')
      ]);
      const pets = (petsResult.data || []).filter(pet => pet.is_listed !== false);
      petSelect.innerHTML = '<option value="">Choose your pet</option>' + pets.map(pet =>
        `<option value="${escapeHTML(pet.id)}">${escapeHTML(pet.name)}${pet.breed ? ` — ${escapeHTML(pet.breed)}` : ''}</option>`
      ).join('');
      if (!pets.length) {
        petSelect.innerHTML = '<option value="">No listed pets available</option>';
        petSelect.disabled = true;
      }
      const selectedPetId = new URLSearchParams(window.location.search).get('pet');
      if (selectedPetId && pets.some(pet => pet.id === selectedPetId)) petSelect.value = selectedPetId;
      providers = providersResult.data || [];
      renderProviders();
      document.getElementById('bookAppointment').disabled = !pets.length || !providers.length;
      const now = new Date();
      document.getElementById('appointmentDate').min = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
      ].join('-');
      updateSelectedProvider();
      await loadHistory();
    } catch (error) {
      console.error('Pet health page initialization failed:', error);
      showMessage(status, error.message || 'Could not load pet health information.');
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || !form.reportValidity()) return;
    const payload = {
      pet_id: petSelect.value,
      shelter_id: providerSelect.value,
      appointment_date: document.getElementById('appointmentDate').value,
      appointment_time: document.getElementById('appointmentTime').value,
      appointment_type: 'vet_visit',
      timezone_offset_minutes: new Date().getTimezoneOffset(),
      veterinarian: document.getElementById('veterinarianName').value.trim() || undefined,
      reason: document.getElementById('appointmentReason').value.trim(),
      notes: document.getElementById('appointmentNotes').value.trim() || undefined
    };
    submitting = true;
    const button = document.getElementById('bookAppointment');
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Submitting…';
    try {
      const result = await apiRequest('', { method: 'POST', body: JSON.stringify(payload) });
      form.reset();
      const selectedPetId = new URLSearchParams(window.location.search).get('pet');
      if (selectedPetId) petSelect.value = selectedPetId;
      providerSelect.value = '';
      updateSelectedProvider();
      showMessage(bookingMessage, result.message || 'Appointment request submitted.', 'success');
      await loadHistory();
    } catch (error) {
      console.error('Appointment request failed:', error);
      showMessage(bookingMessage, error.message);
    } finally {
      submitting = false;
      button.disabled = !providers.length || petSelect.disabled;
      button.innerHTML = '<i class="fas fa-calendar-check me-2" aria-hidden="true"></i>Request appointment';
    }
  });

  providerSelect.addEventListener('change', updateSelectedProvider);
  history.addEventListener('click', async event => {
    const button = event.target.closest('[data-cancel-appointment]');
    if (!button || button.disabled) return;
    if (!window.confirm('Cancel this appointment request?')) return;
    button.disabled = true;
    button.textContent = 'Cancelling…';
    try {
      const result = await apiRequest(`/${encodeURIComponent(button.dataset.cancelAppointment)}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ timezone_offset_minutes: new Date().getTimezoneOffset() })
      });
      showMessage(bookingMessage, result.message || 'Appointment cancelled.', 'success');
      await loadHistory();
    } catch (error) {
      console.error('Appointment cancellation failed:', error);
      showMessage(bookingMessage, error.message);
      button.disabled = false;
      button.textContent = 'Cancel appointment';
    }
  });
  document.getElementById('refreshAppointments').addEventListener('click', loadHistory);
  document.addEventListener('DOMContentLoaded', initialize);
})();
