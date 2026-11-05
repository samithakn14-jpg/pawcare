(() => {
  const form = document.getElementById('vaccinationForm');
  const tbody = document.getElementById('vaccinationRows');
  const notice = document.getElementById('vaccinationNotice');
  const petSelect = document.getElementById('vaccinationPet');
  const saveButton = document.getElementById('saveVaccination');
  let pets = [];
  let records = [];
  let saving = false;

  const field = id => document.getElementById(id);
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  function showNotice(message, kind = 'danger') {
    notice.textContent = message;
    notice.className = `alert alert-${kind} notice`;
  }
  function clearForm() {
    form.reset();
    field('vaccinationId').value = '';
    petSelect.disabled = false;
    field('vaccinationFormHeading').textContent = 'Add a vaccination record';
    saveButton.textContent = 'Save record';
    field('cancelVaccinationEdit').hidden = true;
  }
  async function loadData() {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4"><span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Loading records…</td></tr>';
    try {
      const [petResponse, recordResponse] = await Promise.all([
        window.AdminPortal.request('/pets?limit=100'),
        window.AdminPortal.request('/vaccinations')
      ]);
      pets = petResponse.data || [];
      records = recordResponse.data || [];
      petSelect.innerHTML = '<option value="">Choose a pet</option>' + pets.map(pet =>
        `<option value="${escapeHTML(pet.id)}">${escapeHTML(pet.name)}</option>`
      ).join('');
      if (!pets.length) {
        petSelect.innerHTML = '<option value="">No pets found</option>';
        petSelect.disabled = true;
      }
      renderRecords();
      notice.textContent = '';
      notice.className = 'alert notice';
    } catch (error) {
      console.error('Vaccination records could not be loaded:', error);
      showNotice(error.message);
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-danger">Vaccination records could not be loaded.</td></tr>';
    }
  }
  function renderRecords() {
    if (!records.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-secondary">No vaccination records have been entered.</td></tr>';
      return;
    }
    tbody.innerHTML = records.map(record => `<tr>
      <td>${escapeHTML(record.pets?.name || 'Unknown pet')}</td><td>${escapeHTML(record.vaccine_name)}</td>
      <td>${escapeHTML(record.vaccination_date)}</td><td>${escapeHTML(record.next_due_date || '—')}</td>
      <td>${escapeHTML(record.administered_by || '—')}</td><td>${escapeHTML(record.notes || '—')}</td>
      <td><button class="btn btn-sm btn-outline-primary" type="button" data-edit-vaccination="${escapeHTML(record.id)}">Edit</button></td>
    </tr>`).join('');
  }
  function editRecord(record) {
    field('vaccinationId').value = record.id;
    petSelect.value = record.pet_id;
    petSelect.disabled = true;
    field('vaccineName').value = record.vaccine_name || '';
    field('vaccinationDate').value = record.vaccination_date || '';
    field('nextDueDate').value = record.next_due_date || '';
    field('administeredBy').value = record.administered_by || '';
    field('vaccinationNotes').value = record.notes || '';
    field('vaccinationFormHeading').textContent = `Edit ${record.vaccine_name}`;
    saveButton.textContent = 'Update record';
    field('cancelVaccinationEdit').hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving || !form.reportValidity()) return;
    const id = field('vaccinationId').value;
    const body = {
      pet_id: petSelect.value,
      vaccine_name: field('vaccineName').value.trim(),
      vaccination_date: field('vaccinationDate').value,
      next_due_date: field('nextDueDate').value || null,
      administered_by: field('administeredBy').value.trim() || null,
      notes: field('vaccinationNotes').value.trim() || null
    };
    if (body.next_due_date && body.next_due_date < body.vaccination_date) {
      showNotice('Next due date must not be earlier than the vaccination date.');
      return;
    }
    saving = true;
    saveButton.disabled = true;
    saveButton.textContent = 'Saving…';
    try {
      const { pet_id, ...updates } = body;
      await window.AdminPortal.request(id ? `/vaccinations/${encodeURIComponent(id)}` : '/vaccinations', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(id ? updates : body)
      });
      clearForm();
      await loadData();
      showNotice(id ? 'Vaccination record updated.' : 'Vaccination record added.', 'success');
    } catch (error) {
      console.error('Vaccination record could not be saved:', error);
      showNotice(error.message);
    } finally {
      saving = false;
      saveButton.disabled = false;
      saveButton.textContent = field('vaccinationId').value ? 'Update record' : 'Save record';
    }
  });
  tbody.addEventListener('click', event => {
    const button = event.target.closest('[data-edit-vaccination]');
    if (!button) return;
    const record = records.find(item => item.id === button.dataset.editVaccination);
    if (record) editRecord(record);
  });
  field('cancelVaccinationEdit').addEventListener('click', clearForm);
  field('refreshVaccinations').addEventListener('click', loadData);
  document.addEventListener('DOMContentLoaded', async () => {
    if (await window.AdminPortal.authorize()) await loadData();
  });
})();
