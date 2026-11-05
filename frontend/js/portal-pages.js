(() => {
  const config = window.PAWCARE_CONFIG;
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const formatAge = pet => {
    const years = Number(pet.age_years) || 0;
    const months = Number(pet.age_months) || 0;
    if (years && months) return `${years} year${years === 1 ? '' : 's'}, ${months} month${months === 1 ? '' : 's'}`;
    if (years) return `${years} year${years === 1 ? '' : 's'}`;
    if (months) return `${months} month${months === 1 ? '' : 's'}`;
    return 'Age not listed';
  };
  const setMessage = (element, message, kind = 'info') => {
    if (!element) return;
    element.className = `alert alert-${kind} portal-notice`;
    element.textContent = message;
    element.hidden = false;
  };

  const renderPet = async () => {
    const container = document.getElementById('pet-detail-content');
    if (!container) return;
    const petId = new URLSearchParams(window.location.search).get('id');
    if (!petId) {
      setMessage(container, 'Choose a pet from Adopt or your saved pets to see their profile.', 'warning');
      return;
    }
    if (!config?.supabase) {
      setMessage(container, 'Pet profiles need a connected Supabase project. Please configure frontend/js/config.js, then refresh this page.', 'warning');
      return;
    }
    container.innerHTML = '<div class="text-center py-5" role="status">Loading this pet’s profile…</div>';
    try {
      let pet = null;
      const apiBase = config.API_BASE_URL;
      try {
        const res = await fetch(`${apiBase}/pets/${encodeURIComponent(petId)}`);
        if (res.ok) {
          const apiData = await res.json();
          if (apiData.success && apiData.data) pet = apiData.data;
        }
      } catch (e) {
        console.warn('Backend API /pets/:id failed, using Supabase client:', e.message);
      }

      if (!pet && config?.supabase) {
        const { data, error } = await config.supabase.from('pets').select('*, shelters ( id, name, location )').eq('id', petId).eq('is_listed', true).single();
        if (!error && data) pet = data;
      }
      if (pet && !Array.isArray(pet.vaccination_records) && config?.supabase) {
        const { data, error } = await config.supabase
          .from('vaccination_records')
          .select('id, vaccine_name, vaccination_date, next_due_date, administered_by, notes')
          .eq('pet_id', petId)
          .order('vaccination_date', { ascending: false });
        if (error) throw error;
        pet.vaccination_records = data || [];
      }
      if (!pet) {
        throw new Error('Pet not found. Please browse all available dogs.');
      }
      const photo = pet.primary_image || pet.photo_url || pet.image;
      const location = pet.location || pet.shelters?.location;
      const fee = pet.adoption_fee != null && Number(pet.adoption_fee) > 0
        ? `₹${Number(pet.adoption_fee).toLocaleString('en-IN')}`
        : (pet.adoption_fee === 0 ? 'Free Adoption' : '₹1,000');
      const fields = [
        ['Breed', pet.breed || 'Dog'], ['Age', formatAge(pet)],
        ['Gender', pet.gender || 'Not listed'], ['Size', pet.size || 'Not listed'],
        ['Location', location || 'Contact the shelter'], ['Adoption fee', fee],
        ['Shelter', pet.shelters?.name || pet.shelter_name || 'Verified Shelter Partner']
      ];
      const vaccinations = Array.isArray(pet.vaccination_records) ? pet.vaccination_records : [];
      container.innerHTML = `
        <div class="row g-4 align-items-start">
          <div class="col-lg-6">${photo
            ? `<img class="portal-pet-image" src="${escapeHTML(photo)}" alt="${escapeHTML(pet.name)}" />`
            : '<div class="portal-pet-image d-grid place-items-center"><span class="display-1 m-auto" aria-hidden="true">🐶</span></div>'}
          </div>
          <div class="col-lg-6"><div class="portal-card">
            <span class="portal-kicker">🐕 Dog · ${escapeHTML(pet.adoption_status || pet.status || 'Available')}</span>
            <h2 class="display-5 mt-2">${escapeHTML(pet.name || 'Dog profile')}</h2>
            <div class="h4 text-primary fw-bold my-2">💰 ${escapeHTML(fee)}</div>
            <p class="portal-muted">${escapeHTML(pet.description || 'A loving, healthy dog looking for a caring forever home. Contact the shelter to arrange a visit.')}</p>
            <dl class="row g-2">${fields.map(([label, value]) => `<dt class="col-5">${escapeHTML(label)}</dt><dd class="col-7">${escapeHTML(value)}</dd>`).join('')}</dl>
            <div class="d-flex flex-wrap gap-2 mt-3">
              ${(pet.adoption_status === 'available' || pet.status === 'available') ? `<a class="btn btn-primary px-4" href="adoption-form.html?pet=${encodeURIComponent(pet.id)}">Adopt Now</a>` : ''}
              <a class="btn btn-outline-success px-4" href="health.html?pet=${encodeURIComponent(pet.id)}">Book a vet visit</a>
              <a class="btn btn-outline-primary px-4" href="adopt.html">Browse pets</a>
            </div>
          </div></div>
        </div>
        <section class="portal-card mt-4" aria-labelledby="vaccinationHeading">
          <span class="portal-kicker">Pet health history</span><h2 class="h3 mt-2" id="vaccinationHeading">Vaccination records</h2>
          ${vaccinations.length ? `<div class="table-responsive"><table class="table align-middle mb-0">
            <thead><tr><th>Vaccine</th><th>Date</th><th>Next due</th><th>Administered by</th><th>Notes</th></tr></thead>
            <tbody>${vaccinations.map(record => `<tr><td>${escapeHTML(record.vaccine_name || '—')}</td><td>${escapeHTML(record.vaccination_date || '—')}</td><td>${escapeHTML(record.next_due_date || 'Not listed')}</td><td>${escapeHTML(record.administered_by || 'Not listed')}</td><td>${escapeHTML(record.notes || '—')}</td></tr>`).join('')}</tbody>
          </table></div>` : '<p class="portal-muted mb-0">No vaccination records are listed for this pet yet. Contact the shelter or a veterinarian to confirm the pet’s health history.</p>'}
          <p class="small text-secondary mt-3 mb-0">Records are informational. Confirm current vaccination status with the administering clinic.</p>
        </section>`;
      const image = container.querySelector('img');
      image?.addEventListener('error', () => image.remove(), { once: true });
    } catch (error) {
      console.error('Unable to load pet profile:', error);
      setMessage(container, error.message || 'We could not load this pet profile. Please try again later.', 'danger');
    }
  };

  const renderPetCards = pets => {
    if (!pets.length) return '<p class="portal-muted mb-0">No saved pets yet. Browse the listings and tap the heart to save one.</p>';
    return `<div class="row g-3">${pets.map(pet => `
      <div class="col-md-6"><article class="border rounded-4 p-3 h-100">
        <h3 class="h5">${escapeHTML(pet.name || 'Saved pet')}</h3>
        <p class="portal-muted mb-3">${escapeHTML([pet.breed, formatAge(pet)].filter(Boolean).join(' · '))}</p>
        <div class="d-flex gap-2"><a class="btn btn-outline-primary btn-sm" href="pet-detail.html?id=${encodeURIComponent(pet.id)}">View profile</a>
          <button type="button" class="btn btn-outline-secondary btn-sm" data-unsave-pet="${escapeHTML(pet.id)}">Remove</button></div>
      </article></div>`).join('')}</div>`;
  };

  const renderApplications = applications => {
    if (!applications.length) return '<p class="portal-muted mb-0">Your adoption applications will appear here after you apply for a pet.</p>';
    return `<div class="table-responsive"><table class="table align-middle"><thead><tr><th scope="col">Application</th><th scope="col">Pet</th><th scope="col">Submitted</th><th scope="col">Status</th></tr></thead><tbody>
      ${applications.map(application => {
        const status = {
          pending: ['Pending', 'text-bg-warning'],
          under_review: ['Under review', 'text-bg-info'],
          approved: ['Approved', 'text-bg-success'],
          rejected: ['Rejected', 'text-bg-danger'],
          cancelled: ['Cancelled', 'text-bg-secondary']
        }[application.status] || ['Pending', 'text-bg-warning'];
        return `<tr><td>${escapeHTML(application.id || application.application_id || 'Application')}</td><td>${escapeHTML(application.pets?.name || application.pet_name || application.pet_id || 'Not specified')}</td><td>${escapeHTML(application.application_date || application.created_at ? new Date(application.application_date || application.created_at).toLocaleDateString() : '—')}</td><td><span class="badge ${status[1]}">${status[0]}</span></td></tr>`;
      }).join('')}
    </tbody></table></div>`;
  };

  const renderDashboard = async () => {
    const root = document.getElementById('dashboard-content');
    if (!root) return;
    const profileName = document.getElementById('dashboard-name');
    const status = document.getElementById('dashboard-status');
    const appsTarget = document.getElementById('dashboard-applications');
    const petsTarget = document.getElementById('dashboard-saved-pets');
    if (!config?.supabase) {
      setMessage(status, 'Supabase is not configured. Sign-in is required to view your private dashboard data.', 'danger');
      appsTarget.innerHTML = '<p class="portal-muted mb-0">Application history is unavailable.</p>';
      petsTarget.innerHTML = '<p class="portal-muted mb-0">Saved pets are unavailable.</p>';
      return;
    }

    let user;
    try {
      user = await window.PawCareAuth.requireAuth();
      if (!user) return;
    } catch (error) {
      console.error('Unable to verify dashboard access:', error);
      setMessage(status, 'We could not verify your sign-in. Please refresh the page or log in again.', 'danger');
      return;
    }

    try {
      const { data: profile, error } = await config.supabase.from('users').select('name,email').eq('id', user.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      profileName.textContent = profile?.name || user.user_metadata?.full_name || user.email || 'friend';
    } catch (error) {
      console.error('Unable to load account profile:', error);
      profileName.textContent = user.email || 'friend';
      setMessage(status, 'You are signed in, but profile details could not be loaded. Your applications and saved pets are still available below.', 'warning');
    }
    try {
      const { data: sessionData, error: sessionError } = await config.supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session?.access_token) throw new Error('Your session expired. Please log in again.');
      const response = await fetch(`${config.API_BASE_URL}/adoptions`, {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` }
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Application history could not be loaded.');
      }
      appsTarget.innerHTML = renderApplications(result.data || []);
    } catch (error) {
      console.error('Unable to load adoption applications:', error);
      appsTarget.innerHTML = `<p class="text-danger mb-0">Application history could not be loaded: ${escapeHTML(error.message)}</p>`;
    }
    try {
      const { data, error } = await config.supabase.from('saved_pets').select('pet_id, pets ( id, name, breed, species, age_years, age_months )').eq('user_id', user.id);
      if (error) throw error;
      const pets = (data || []).map(row => row.pets).filter(Boolean);
      petsTarget.innerHTML = renderPetCards(pets);
    } catch (error) {
      console.error('Unable to load saved pets:', error);
      petsTarget.innerHTML = `<p class="text-danger mb-0">Saved pets could not be loaded: ${escapeHTML(error.message)}</p>`;
    }
    if (!root.dataset.unsaveBound) {
    root.dataset.unsaveBound = 'true';
    root.addEventListener('click', async event => {
      const button = event.target.closest('[data-unsave-pet]');
      if (!button) return;
      button.disabled = true;
      try {
        const { error } = await config.supabase.from('saved_pets').delete().eq('user_id', user.id).eq('pet_id', button.dataset.unsavePet);
        if (error) throw error;
        const saved = JSON.parse(localStorage.getItem('pawcare_saved_pets') || '[]').filter(id => id !== button.dataset.unsavePet);
        localStorage.setItem('pawcare_saved_pets', JSON.stringify(saved));
        await renderDashboard();
      } catch (error) {
        console.error('Unable to remove saved pet:', error);
        setMessage(status, `Could not remove this saved pet: ${error.message}`, 'danger');
        button.disabled = false;
      }
    });
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    void renderPet();
    void renderDashboard();
  });
})();
