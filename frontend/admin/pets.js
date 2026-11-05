(() => {
  const form = document.getElementById('petForm');
  const tbody = document.getElementById('petsTableBody');
  const notice = document.getElementById('petsNotice');
  const submitButton = document.getElementById('savePetButton');
  const filter = document.getElementById('listingFilter');
  const field = id => document.getElementById(id);
  let pets = [];
  let pendingAction = false;

  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  function showNotice(message, kind = 'danger') {
    notice.textContent = message;
    notice.className = `alert alert-${kind} notice`;
  }

  function clearForm() {
    form.reset();
    field('petId').value = '';
    field('petAgeYears').value = '0';
    field('petAgeMonths').value = '0';
    field('petFee').value = '0';
    field('petFormHeading').textContent = 'Add a listing';
    field('savePetButton').textContent = 'Save pet';
    field('cancelPetEdit').hidden = true;
  }

  function renderPets() {
    field('petCount').textContent = String(pets.length);
    if (!pets.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center py-5 text-secondary">No pets match this filter.</td></tr>';
      return;
    }

    tbody.innerHTML = pets.map(pet => {
      const age = [pet.age_years ? `${pet.age_years} yr` : '', pet.age_months ? `${pet.age_months} mo` : ''].filter(Boolean).join(' ') || '—';
      const photo = /^https?:\/\//i.test(pet.primary_image || '') ? pet.primary_image : '';
      const visibility = pet.is_listed ? 'Listed' : 'Archived';
      return `<tr>
        <td>${photo ? `<img class="dog-thumb" src="${escapeHTML(photo)}" alt="${escapeHTML(pet.name)}" loading="lazy">` : '<span class="dog-thumb d-inline-flex align-items-center justify-content-center text-secondary"><i class="fas fa-paw" aria-hidden="true"></i></span>'}</td>
        <td><strong>${escapeHTML(pet.name)}</strong></td>
        <td>${escapeHTML(pet.breed || '—')}</td><td>${escapeHTML(age)}</td><td>${escapeHTML(pet.gender || '—')}</td>
        <td>${escapeHTML(pet.location || '—')}</td><td>₹${Number(pet.adoption_fee || 0).toLocaleString('en-IN')}</td>
        <td><span class="badge ${pet.is_listed ? 'text-bg-success' : 'text-bg-secondary'}">${visibility}</span><br><span class="small text-secondary">${escapeHTML(pet.adoption_status || 'available')}</span></td>
        <td class="text-end text-nowrap">
          <button class="btn btn-sm btn-outline-primary mb-1" type="button" data-pet-edit="${escapeHTML(pet.id)}">Edit</button>
          ${pet.is_listed
            ? `<button class="btn btn-sm btn-outline-danger mb-1" type="button" data-pet-archive="${escapeHTML(pet.id)}">Archive</button>`
            : `<button class="btn btn-sm btn-outline-success mb-1" type="button" data-pet-restore="${escapeHTML(pet.id)}">Restore</button>`}
          <a class="btn btn-sm btn-outline-secondary mb-1" href="../pet-detail.html?id=${encodeURIComponent(pet.id)}" target="_blank" rel="noopener">View</a>
        </td>
      </tr>`;
    }).join('');
  }

  async function loadPets() {
    document.getElementById('refreshPets').disabled = true;
    notice.textContent = '';
    notice.className = 'alert notice';
    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4"><span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Loading listings…</td></tr>';
    try {
      const response = await window.AdminPortal.request('/pets?limit=100');
      const allPets = response.data || [];
      pets = filter.value === 'all' ? allPets
        : allPets.filter(pet => filter.value === 'listed' ? pet.is_listed !== false : pet.is_listed === false);
      renderPets();
    } catch (error) {
      console.error('Pet listings could not be loaded:', error);
      showNotice(error.message);
      tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-danger">Pet listings could not be loaded.</td></tr>';
    } finally {
      document.getElementById('refreshPets').disabled = false;
    }
  }

  function editPet(pet) {
    field('petId').value = pet.id;
    field('petName').value = pet.name || '';
    field('petBreed').value = pet.breed || '';
    field('petAgeYears').value = pet.age_years ?? 0;
    field('petAgeMonths').value = pet.age_months ?? 0;
    field('petGender').value = pet.gender || '';
    field('petSize').value = pet.size || '';
    field('petStatus').value = pet.adoption_status || 'available';
    field('petFee').value = pet.adoption_fee ?? 0;
    field('petColor').value = pet.color || '';
    field('petLocation').value = pet.location || '';
    field('petImage').value = pet.primary_image || '';
    field('petVaccinated').checked = pet.vaccination_status === true;
    field('petDescription').value = pet.description || '';
    field('petFormHeading').textContent = `Edit ${pet.name}`;
    field('savePetButton').textContent = 'Update pet';
    field('cancelPetEdit').hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function buildPayload() {
    return {
      name: field('petName').value.trim(),
      species: 'dog',
      breed: field('petBreed').value.trim() || null,
      age_years: Number(field('petAgeYears').value || 0),
      age_months: Number(field('petAgeMonths').value || 0),
      gender: field('petGender').value || null,
      size: field('petSize').value || null,
      adoption_status: field('petStatus').value,
      adoption_fee: Number(field('petFee').value || 0),
      color: field('petColor').value.trim() || null,
      location: field('petLocation').value.trim() || null,
      primary_image: field('petImage').value.trim() || null,
      vaccination_status: field('petVaccinated').checked,
      description: field('petDescription').value.trim() || null
    };
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity() || pendingAction) return;
    const payload = buildPayload();
    if (!payload.name || !Number.isFinite(payload.adoption_fee) || payload.adoption_fee < 0) {
      showNotice('Enter a pet name and a valid non-negative adoption fee.');
      return;
    }
    pendingAction = true;
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Saving…';
    try {
      const id = field('petId').value;
      await window.AdminPortal.request(id ? `/pets/${encodeURIComponent(id)}` : '/pets', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      clearForm();
      await loadPets();
      showNotice(id ? 'Pet listing updated.' : 'Pet listing created.', 'success');
    } catch (error) {
      console.error('Pet listing could not be saved:', error);
      showNotice(error.message);
    } finally {
      pendingAction = false;
      submitButton.disabled = false;
      submitButton.textContent = field('petId').value ? 'Update pet' : 'Save pet';
    }
  });

  tbody.addEventListener('click', async event => {
    if (pendingAction) return;
    const editButton = event.target.closest('[data-pet-edit]');
    if (editButton) {
      const pet = pets.find(item => item.id === editButton.dataset.petEdit);
      if (pet) editPet(pet);
      return;
    }
    const archiveButton = event.target.closest('[data-pet-archive]');
    const restoreButton = event.target.closest('[data-pet-restore]');
    const button = archiveButton || restoreButton;
    if (!button) return;
    const isArchive = Boolean(archiveButton);
    const pet = pets.find(item => item.id === button.dataset[isArchive ? 'petArchive' : 'petRestore']);
    if (isArchive && !window.confirm(`Archive ${pet?.name || 'this pet'}? The listing will be hidden from the public catalog, while its application history is preserved.`)) return;
    if (!isArchive && !window.confirm(`Restore ${pet?.name || 'this pet'} to the public listings?`)) return;
    pendingAction = true;
    button.disabled = true;
    try {
      if (isArchive) {
        await window.AdminPortal.request(`/pets/${encodeURIComponent(button.dataset.petArchive)}`, { method: 'DELETE' });
      } else {
        await window.AdminPortal.request(`/pets/${encodeURIComponent(button.dataset.petRestore)}`, {
          method: 'PUT',
          body: JSON.stringify({ is_listed: true })
        });
      }
      await loadPets();
      showNotice(isArchive ? 'Pet listing archived. Existing applications remain intact.' : 'Pet listing restored.', 'success');
    } catch (error) {
      console.error('Pet listing visibility update failed:', error);
      showNotice(error.message);
      button.disabled = false;
    } finally {
      pendingAction = false;
    }
  });

  document.getElementById('newPetButton').addEventListener('click', () => {
    clearForm();
    field('petName').focus();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.getElementById('cancelPetEdit').addEventListener('click', clearForm);
  document.getElementById('refreshPets').addEventListener('click', loadPets);
  filter.addEventListener('change', loadPets);
  document.addEventListener('DOMContentLoaded', async () => {
    if (await window.AdminPortal.authorize()) await loadPets();
  });
})();
