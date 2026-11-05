(() => {
  const config = window.PAWCARE_CONFIG;

  const setAccessMessage = message => {
    const status = document.getElementById('adminAccessState');
    if (status) {
      status.textContent = message;
      status.hidden = false;
    }
  };

  async function authorize() {
    const app = document.getElementById('adminApp');
    if (!config?.supabase || !window.PawCareAuth) {
      setAccessMessage('Admin sign-in is unavailable. Check the Supabase configuration and refresh.');
      return false;
    }

    try {
      const user = await window.PawCareAuth.getCurrentUser();
      if (!user) {
        const redirect = `admin/${window.location.pathname.split('/').pop()}${window.location.search}`;
        const login = new URL('../login.html', window.location.href);
        login.searchParams.set('redirect', redirect);
        window.location.href = login.href;
        return false;
      }

      const { data: profile, error: profileError } = await config.supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      if (profileError) throw new Error(`Could not verify administrator role: ${profileError.message}`);
      if (profile?.role !== 'admin') {
        setAccessMessage('Admin access is required for this page. You will be returned to the public site.');
        window.setTimeout(() => { window.location.href = '../index.html'; }, 1800);
        return false;
      }

      const status = document.getElementById('adminAccessState');
      if (status) status.hidden = true;
      if (app) app.hidden = false;
      document.querySelectorAll('[data-admin-signout]').forEach(button => {
        button.addEventListener('click', async () => {
          button.disabled = true;
          try {
            const { error } = await config.supabase.auth.signOut();
            if (error) throw error;
            window.location.href = '../index.html';
          } catch (error) {
            button.disabled = false;
            setAccessMessage(`Could not sign out: ${error.message}`);
          }
        });
      });
      return true;
    } catch (error) {
      console.error('Admin page authorization failed:', error);
      setAccessMessage(`Could not verify admin access: ${error.message}`);
      return false;
    }
  }

  async function request(path, options = {}) {
    const { data, error } = await config.supabase.auth.getSession();
    if (error) throw error;
    if (!data.session?.access_token) throw new Error('Your session expired. Sign in again.');

    const response = await fetch(`${config.API_BASE_URL}/admin${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${data.session.access_token}`,
        ...(options.headers || {})
      }
    });
    let result;
    try {
      result = await response.json();
    } catch (error) {
      throw new Error(`Admin API returned an invalid response (HTTP ${response.status}).`);
    }
    if (!response.ok || !result.success) {
      const validationMessage = result.errors?.map(item => item.msg).filter(Boolean).join(' ');
      throw new Error(result.message || validationMessage || `Admin request failed (HTTP ${response.status}).`);
    }
    return result;
  }

  window.AdminPortal = { authorize, request };
})();
