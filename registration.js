(() => {
  'use strict';
  async function api(path, data) {
    const response = await fetch(path, {
      method: data ? 'POST' : 'GET',
      headers: data ? { 'Content-Type': 'application/json' } : {},
      ...(data ? { body: JSON.stringify(data) } : {}),
      signal: AbortSignal.timeout(20000),
      credentials: 'same-origin',
    });
    let result;
    try { result = await response.json(); } catch { throw new Error('No pudimos comunicarnos con el servidor. Intenta nuevamente.'); }
    if (!response.ok) throw new Error(result.message || 'No pudimos completar la operación.');
    return result;
  }
  const errorMessage = error => error.name === 'TimeoutError' || error.name === 'TypeError'
    ? 'No pudimos conectar. Revisa tu conexión e intenta nuevamente.' : error.message;

  async function initPrivacy() {
    const contact = document.querySelector('#privacy-contact');
    if (!contact || location.protocol === 'file:') return;
    try {
      const config = await api('/api/status');
      if (config.privacyContact) contact.textContent = `Contacto del responsable: ${config.privacyContact}`;
    } catch { /* La información estática sigue siendo legible si el servidor no responde. */ }
  }

  function initUnsubscribe() {
    const form = document.querySelector('#unsubscribe-form');
    if (!form) return;
    const token = location.hash.slice(1);
    history.replaceState(null, '', location.pathname);
    const button = form.querySelector('button');
    const status = document.querySelector('#unsubscribe-status');
    if (!token) { status.textContent = 'Abre el enlace completo de baja que recibiste en el correo de confirmación.'; return; }
    button.disabled = false;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      button.disabled = true;
      try {
        await api('/api/registration/unsubscribe', { token });
        status.textContent = 'Tu inscripción y los datos asociados fueron eliminados.';
        form.hidden = true;
      } catch (error) { status.textContent = errorMessage(error); button.disabled = false; }
    });
  }

  async function initRegistration() {
    const form = document.querySelector('#registration-form');
    if (!form) return;
    const verify = document.querySelector('#verification-form');
    const submit = form.querySelector('[type="submit"]');
    const status = document.querySelector('#form-status');
    const availability = document.querySelector('#registration-availability');
    const verificationStatus = document.querySelector('#verification-status');
    const resend = document.querySelector('#resend-code');
    const edit = document.querySelector('#edit-email');
    const success = document.querySelector('#registration-success');
    const retry = document.querySelector('#retry-receipt');
    const name = form.elements.namedItem('name');
    let registration;
    let challengeId;
    let verification;
    let resendTimer;
    let resendUntil = 0;
    let busy = false;

    function step(index) {
      document.querySelectorAll('.registration-steps li').forEach((item, position) => {
        if (position === index) item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
      });
    }
    function cooldown(seconds) {
      clearInterval(resendTimer);
      const until = resendUntil = Date.now() + seconds * 1000;
      const update = () => {
        const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
        resend.disabled = busy || remaining > 0;
        resend.textContent = remaining ? `Reenviar en ${remaining} s` : 'Reenviar código';
        if (!remaining) clearInterval(resendTimer);
      };
      update();
      resendTimer = setInterval(update, 1000);
    }
    function setBusy(value, targetForm) {
      busy = value;
      targetForm.setAttribute('aria-busy', String(value));
      targetForm.querySelector('[type="submit"]').disabled = value;
      edit.disabled = value;
      if (value) resend.disabled = true;
      else resend.disabled = Date.now() < resendUntil;
    }
    function showReceipt(result) {
      document.querySelector('#receipt-status').textContent = result.receipt === 'sent'
        ? 'El proveedor aceptó el correo de confirmación. Revisa tu bandeja y Spam; la entrega puede tardar.'
        : 'Tu inscripción está confirmada, pero el envío del comprobante quedó pendiente. Puedes reintentarlo sin duplicar tu registro.';
      retry.hidden = result.receipt === 'sent';
    }

    if (location.protocol === 'file:') {
      availability.textContent = 'Para registrarte, abre la versión alojada o el servidor de desarrollo. El registro requiere conexión con el servidor.';
      return;
    }
    try {
      const config = await api('/api/status');
      if (!config.registrationAvailable) {
        availability.textContent = 'El registro está temporalmente cerrado mientras configuramos el servicio de correo. Vuelve pronto.';
        return;
      }
      availability.textContent = 'Tres pasos: completa tus datos, verifica tu correo y recibe tu confirmación. Sin pagos.';
      submit.disabled = false;
    } catch (error) { availability.textContent = errorMessage(error); return; }

    name.addEventListener('input', () => name.setCustomValidity(name.value.trim().length < 2 ? 'Escribe un nombre de al menos 2 caracteres.' : ''));
    form.addEventListener('input', () => { status.textContent = ''; });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy) return;
      name.value = name.value.trim();
      name.setCustomValidity(name.value.length < 2 ? 'Escribe un nombre de al menos 2 caracteres.' : '');
      if (!form.reportValidity()) return;
      registration = {
        name: name.value, email: form.elements.namedItem('email').value.trim(),
        platform: form.elements.namedItem('platform').value,
        consent: form.elements.namedItem('consent').checked,
        website: form.elements.namedItem('website').value,
      };
      setBusy(true, form);
      status.textContent = 'Enviando tu código…';
      try {
        const result = await api('/api/registration/start', registration);
        challengeId = result.challengeId;
        document.querySelector('#verification-description').textContent = `Enviamos un código a ${registration.email}.`;
        form.hidden = true;
        verify.hidden = false;
        availability.hidden = true;
        step(1);
        document.querySelector('#verification-code').focus();
        cooldown(result.resendAfter);
      } catch (error) { status.textContent = errorMessage(error); }
      finally { setBusy(false, form); }
    });
    resend.addEventListener('click', async () => {
      if (busy) return;
      setBusy(true, verify);
      verificationStatus.textContent = 'Enviando un nuevo código…';
      try {
        const result = await api('/api/registration/start', registration);
        challengeId = result.challengeId;
        verify.reset();
        verificationStatus.textContent = 'Nuevo código enviado. Usa el más reciente.';
        cooldown(result.resendAfter);
      } catch (error) { verificationStatus.textContent = errorMessage(error); cooldown(60); }
      finally { setBusy(false, verify); }
    });
    edit.addEventListener('click', () => {
      if (busy) return;
      clearInterval(resendTimer);
      verify.hidden = true;
      form.hidden = false;
      availability.hidden = false;
      status.textContent = '';
      verificationStatus.textContent = '';
      verify.reset();
      step(0);
      form.elements.namedItem('email').focus();
    });
    verify.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy || !verify.reportValidity()) return;
      setBusy(true, verify);
      verificationStatus.textContent = 'Verificando tu correo…';
      const payload = { challengeId, code: verify.elements.namedItem('code').value.trim() };
      try {
        const result = await api('/api/registration/verify', payload);
        verification = payload;
        clearInterval(resendTimer);
        verify.hidden = true;
        success.hidden = false;
        document.querySelector('#registration-reference').textContent = result.reference;
        showReceipt(result);
        step(2);
        form.reset(); verify.reset(); registration = null;
        document.querySelector('#success-title').focus();
      } catch (error) { verificationStatus.textContent = errorMessage(error); }
      finally { setBusy(false, verify); }
    });
    retry.addEventListener('click', async () => {
      retry.disabled = true;
      try { showReceipt(await api('/api/registration/verify', verification)); }
      catch (error) { document.querySelector('#receipt-status').textContent = errorMessage(error); }
      finally { retry.disabled = false; }
    });
  }
  initUnsubscribe();
  initPrivacy();
  initRegistration();
})();
