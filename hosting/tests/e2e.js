async (page) => {
  const checks = [];
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
    checks.push(message);
  };
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:4173');
  await page.locator('#reserve-cta').click();
  await page.waitForFunction(() => !document.querySelector('#registration-form [type="submit"]').disabled);
  const email = `visitor+${Date.now()}@example.com`;
  await page.getByLabel('Nombre', { exact: true }).fill('Visitante de prueba');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Plataforma', { exact: true }).selectOption('xbox');
  await page.locator('#consent').check();
  await page.getByRole('button', { name: 'Enviar mi código' }).click();
  await page.locator('#verification-form').waitFor({ state: 'visible' });
  assert((await page.locator('.registration-steps [aria-current]').textContent()).startsWith('2.'), 'Paso 2 visible después de que el servidor acepta el envío');
  assert(await page.locator('#resend-code').isDisabled(), 'Reenvío deshabilitado durante el cooldown');
  const messages = await (await page.request.get('http://127.0.0.1:4173/__test/mail')).json();
  const mail = messages.find(message => message.to[0] === email);
  const code = /código de verificación es: (\d{6})/.exec(mail.text)[1];
  await page.getByLabel('Código de 6 dígitos').fill(code === '000000' ? '000001' : '000000');
  await page.getByRole('button', { name: 'Verificar y confirmar' }).click();
  await page.waitForFunction(() => document.querySelector('#verification-status').textContent.includes('incorrecto'));
  assert(await page.locator('#verification-form').isVisible(), 'Código incorrecto mantiene el paso de verificación');
  await page.getByLabel('Código de 6 dígitos').fill(code);
  await page.getByRole('button', { name: 'Verificar y confirmar' }).click();
  await page.locator('#registration-success').waitFor({ state: 'visible' });
  assert((await page.locator('.registration-steps [aria-current]').textContent()).startsWith('3.'), 'Paso 3 confirma el registro persistido');
  assert((await page.locator('#registration-reference').textContent()).length === 36, 'Referencia única del registro');
  const after = await (await page.request.get('http://127.0.0.1:4173/__test/mail')).json();
  const receipt = after.find(message => message.to[0] === email && message.subject.startsWith('Registro confirmado'));
  assert(Boolean(receipt), 'Comprobante de confirmación entregado al buzón de pruebas');
  const link = /Eliminar tu inscripción: ([^\s]+)/.exec(receipt.text)[1];
  await page.goto(link);
  await page.waitForFunction(() => !document.querySelector('#unsubscribe-form button').disabled);
  assert((await page.url()).endsWith('/baja'), 'Token de baja retirado de la barra de dirección');
  await page.getByRole('button', { name: 'Eliminar mi inscripción' }).click();
  await page.waitForFunction(() => document.querySelector('#unsubscribe-status').textContent.includes('eliminados'));
  assert(true, 'Baja confirmada mediante POST explícito');
  await page.goto('http://127.0.0.1:4173');
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Sin desbordamiento a ${width}px`);
  }
  await page.locator('#registro').screenshot({ path: 'backend-registration-mobile.png' });
  assert(errors.length === 0, 'Sin errores JavaScript de la aplicación');
  return { checks, note: 'Buzón de pruebas local; no se enviaron correos reales.' };
}
