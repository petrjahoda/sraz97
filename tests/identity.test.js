import { test } from 'node:test';
import assert from 'node:assert/strict';
import { personIdFromEmail, isValidEmail } from '../js/identity.js';

test('personId is the first 20 hex chars of SHA-256 of the normalised e-mail', async () => {
  // sha256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
  assert.equal(await personIdFromEmail('abc'), 'ba7816bf8f01cfea4141');
});

test('personId ignores case and surrounding spaces', async () => {
  assert.equal(await personIdFromEmail('  ABC '), 'ba7816bf8f01cfea4141');
  assert.equal(
    await personIdFromEmail('Martina.Novakova@Seznam.cz'),
    await personIdFromEmail('martina.novakova@seznam.cz'),
  );
});

test('isValidEmail accepts normal addresses and rejects junk', () => {
  assert.equal(isValidEmail('tvuj@email.cz'), true);
  assert.equal(isValidEmail(' petr.novak+sraz@gmail.com '), true);
  assert.equal(isValidEmail('petr'), false);
  assert.equal(isValidEmail('petr@'), false);
  assert.equal(isValidEmail('petr@seznam'), false);
  assert.equal(isValidEmail('pe tr@seznam.cz'), false);
});
