// Deterministic behavior checks; visual layout is reviewed separately in a browser.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function harness({ savedTheme = null, storageBlocked = false, systemDark = false } = {}) {
  class Element {
    constructor() { this.attrs = {}; this.dataset = {}; this.style = {}; this.children = []; this.listeners = {}; this.hidden = false; this.disabled = false; this.textContent = ''; this.value = ''; this.classList = { toggle() {} }; }
    setAttribute(key, value) { this.attrs[key] = String(value); if (key.startsWith('data-')) this.dataset[key.slice(5)] = String(value); }
    getAttribute(key) { return this.attrs[key] ?? null; }
    toggleAttribute(key, enabled) { if (enabled) this.attrs[key] = ''; else delete this.attrs[key]; if (key === 'hidden') this.hidden = enabled; }
    addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
    fire(type, extra = {}) { if (type === 'click' && this.disabled) return; for (const callback of this.listeners[type] || []) callback({ target: this, currentTarget: this, ...extra }); }
    append(...items) { this.children.push(...items); }
    prepend(item) { this.children.unshift(item); }
    replaceChildren(...items) { this.children = items; }
    focus() {}
    closest() { return this; }
  }
  const elements = {};
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  for (const match of html.matchAll(/id="([^"]+)"/g)) elements[match[1]] = new Element();
  elements.mode.value = 'normal';
  elements.goal.value = '8';
  elements['preferences-panel'].hidden = true;
  const radios = ['light', 'dark', 'system'].map(value => Object.assign(new Element(), { value }));
  const root = new Element();
  const meta = new Element();
  const documentEvents = {};
  const document = {
    documentElement: root,
    getElementById: id => { assert.ok(elements[id], `Missing fixture element ${id}`); return elements[id]; },
    querySelector: () => meta,
    querySelectorAll: () => radios,
    createElement: () => new Element(), createElementNS: () => new Element(),
    addEventListener: (type, listener) => { (documentEvents[type] ||= []).push(listener); },
  };
  let clock = 1_700_000_000_000;
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } }
  let intervalCount = 0;
  const intervals = new Map();
  const memory = new Map(savedTheme ? [['water-buddy-theme', savedTheme]] : []);
  const storage = { getItem: key => { if (storageBlocked) throw Error('blocked'); return memory.get(key) ?? null; }, setItem: (key, value) => { if (storageBlocked) throw Error('blocked'); memory.set(key, value); } };
  const media = { matches: systemDark, addEventListener: (_, fn) => { media.onChange = fn; } };
  const window = { matchMedia: () => media, isSecureContext: false };
  const context = vm.createContext({ window, document, localStorage: storage, Date: ClockDate, console, setInterval: callback => { intervals.set(++intervalCount, callback); return intervalCount; }, clearInterval: id => intervals.delete(id) });
  for (const file of ['theme.js', 'script.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), context, { filename: file });
  return {
    elements, root, memory, media, theme: window.waterBuddyTheme,
    click: id => elements[id].fire('click'),
    change: (id, value) => { elements[id].value = value; elements[id].fire('change'); },
    tick: milliseconds => { clock += milliseconds; for (const callback of [...intervals.values()]) callback(); },
    themeRadio: value => radios.find(radio => radio.value === value).fire('change'),
    event: (type, details) => { for (const listener of documentEvents[type] || []) listener(details); },
  };
}

test('starts empty, fills one eighth per accepted click, and records one activity entry', () => {
  const app = harness();
  assert.equal(app.elements['cup-water'].getAttribute('height'), '0');
  app.click('water-button');
  assert.equal(app.elements['water-counter'].textContent, '0 glasses');
  app.click('start-button');
  app.click('water-button');
  assert.equal(app.elements['cup-water'].getAttribute('height'), '24.5');
  app.click('water-button'); app.click('water-button');
  assert.equal(app.elements['cup-water'].getAttribute('height'), '73.5');
  assert.equal(app.elements['cup-progress'].getAttribute('aria-valuenow'), '3');
  assert.equal(app.elements['activity-list'].children.length, 3);
});

test('cup clamps at the goal while count grows; changing the goal recalculates fill', () => {
  const app = harness();
  app.change('goal', '4'); app.click('start-button');
  for (let count = 0; count < 5; count++) app.click('water-button');
  assert.equal(app.elements['cup-water'].getAttribute('height'), '196');
  assert.equal(app.elements['water-counter'].textContent, '5 glasses');
  assert.equal(app.elements['cup-progress'].getAttribute('aria-valuenow'), '4');
  app.change('goal', '10');
  assert.equal(app.elements['cup-water'].getAttribute('height'), '98');
  assert.equal(app.elements['cup-ticks'].children.length, 20);
});

test('pause freezes time; resume continues; Stop preserves water but resets countdown', () => {
  const app = harness();
  app.change('mode', 'demo'); app.click('start-button'); app.click('water-button');
  app.tick(3000); assert.equal(app.elements.timer.textContent, '00:07');
  app.click('pause-button'); app.tick(60_000);
  assert.equal(app.elements.timer.textContent, '00:07');
  assert.equal(app.elements['water-button'].disabled, true);
  app.click('pause-button'); app.tick(2000);
  assert.equal(app.elements.timer.textContent, '00:05');
  app.click('start-button');
  assert.equal(app.elements.timer.textContent, '00:10');
  assert.equal(app.elements['water-counter'].textContent, '1 glass');
  assert.equal(app.elements.mode.disabled, false);
});

test('overdue countdown expires once; logging a glass clears reminder and restarts', () => {
  const app = harness();
  app.change('mode', 'demo'); app.click('start-button'); app.tick(60_000);
  assert.equal(app.elements.timer.textContent, '00:00');
  assert.equal(app.elements.reminder.hidden, false);
  assert.equal(app.elements['pause-button'].disabled, true);
  app.click('water-button');
  assert.equal(app.elements.reminder.hidden, true);
  assert.equal(app.elements.timer.textContent, '00:10');
  assert.equal(app.elements['water-counter'].textContent, '1 glass');
});

test('theme persists independently and switching it preserves timer and water', () => {
  const app = harness({ savedTheme: 'light' });
  assert.equal(app.root.dataset.theme, 'light');
  app.click('start-button'); app.click('water-button'); app.tick(5000);
  app.themeRadio('dark');
  assert.equal(app.root.dataset.theme, 'dark');
  assert.equal(app.memory.get('water-buddy-theme'), 'dark');
  assert.equal(app.elements.timer.textContent, '29:55');
  assert.equal(app.elements['water-counter'].textContent, '1 glass');
});

test('System theme responds to OS changes; explicit mode ignores those changes', () => {
  const app = harness({ savedTheme: 'system', systemDark: false });
  assert.equal(app.root.dataset.theme, 'light');
  app.media.matches = true; app.media.onChange();
  assert.equal(app.root.dataset.theme, 'dark');
  app.theme.set('light'); app.media.onChange();
  assert.equal(app.root.dataset.theme, 'light');
});

test('blocked storage does not prevent using theme controls or timer', () => {
  const app = harness({ storageBlocked: true });
  app.themeRadio('light');
  assert.equal(app.root.dataset.theme, 'light');
  assert.equal(app.theme.saved, false);
  assert.match(app.elements['theme-status'].textContent, /storage is unavailable/);
  app.click('start-button'); app.tick(1000);
  assert.equal(app.elements.timer.textContent, '29:59');
});

test('Preferences closes with Escape and returns its expanded state to false', () => {
  const app = harness(); app.click('preferences-button');
  assert.equal(app.elements['preferences-panel'].hidden, false);
  app.event('keydown', { key: 'Escape' });
  assert.equal(app.elements['preferences-panel'].hidden, true);
  assert.equal(app.elements['preferences-button'].getAttribute('aria-expanded'), 'false');
});
