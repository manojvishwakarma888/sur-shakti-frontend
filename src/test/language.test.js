import test from 'node:test';
import assert from 'node:assert/strict';
import { messages } from '../i18n/messages.js';
import { translate } from '../i18n/translate.js';

test('English is unchanged and both Indian languages translate labels', () => {
  assert.equal(translate('Event Management'), 'Event Management');
  assert.equal(translate('Event Management', 'hi'), 'कार्यक्रम प्रबंधन');
  assert.equal(translate('Event Management', 'gu'), 'કાર્યક્રમ વ્યવસ્થાપન');
  assert.equal(translate('Name entered by resident', 'gu'), 'Name entered by resident');
});
test('interpolation preserves names and amounts verbatim', () => {
  assert.equal(translate('Welcome home, {{v0}}!', 'hi', { v0: 'Manoj' }), 'घर पर स्वागत है, Manoj!');
  assert.equal(translate('{{v0}} due', 'gu', { v0: '₹4,500' }), '₹4,500 બાકી');
  assert.equal(translate(null, 'gu'), null);
});
test('all translations are complete and preserve interpolation placeholders', () => {
  const placeholders = text => [...text.matchAll(/\{\{\w+\}\}/g)].map(match => match[0]).sort();
  for (const [key, values] of Object.entries(messages)) {
    for (const language of ['hi', 'gu']) {
      assert.ok(values[language].trim(), `${language}: ${key}`);
      assert.deepEqual(placeholders(values[language]), placeholders(key), `${language}: ${key}`);
    }
  }
});
