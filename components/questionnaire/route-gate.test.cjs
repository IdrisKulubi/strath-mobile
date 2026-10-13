const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness() {
  let path = '/login';
  let identity = { isPending: true, refetch: () => {} };
  let experience = { isPending: true };
  const redirects = [];
  const effects = [];
  const refs = [];
  let cursor = 0;
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useRef: (value) => refs[cursor++] ?? (refs[cursor - 1] = { current: value }),
    useEffect: (effect) => effects.push(effect),
  };
  const router = { replace: (target) => redirects.push(target) };
  const modules = {
    react,
    'expo-router': { usePathname: () => path, useRouter: () => router },
    'react-native': { View: 'View', StyleSheet: { create: (styles) => styles, absoluteFillObject: {} } },
    './ui': { Page: 'Page', Loading: 'Loading', Feedback: 'Feedback', Action: 'Action' },
    '@/lib/questionnaire': { useIdentity: () => identity, useExperience: () => experience },
  };
  const source = fs.readFileSync(`${__dirname}/route-gate.tsx`, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: (name) => modules[name], __DEV__: false });
  const child = { navigator: true };
  return {
    redirects,
    render(next = {}) {
      path = next.path ?? path;
      identity = next.identity ?? identity;
      experience = next.experience ?? experience;
      cursor = 0;
      const tree = exports.QuestionnaireRouteGate({ children: child });
      // The navigator must remain in the same element position and type during
      // pending/error/redirect states, so React never tears down its Modals.
      assert.equal(tree.type, 'View');
      assert.equal(tree.children[0].type, 'View');
      assert.equal(tree.children[0].children[0], child);
      effects.splice(0).forEach((effect) => effect());
      return tree;
    },
  };
}

test('demo handoff keeps navigation mounted and redirects once', () => {
  const app = harness();
  app.render();
  app.render({ identity: { data: null, isPending: false, refetch: () => {} } });
  app.render({ identity: { data: 'demo-dates-main', isPending: false, refetch: () => {} } });
  app.render({ experience: { data: { shell: true }, isPending: false } });
  for (let i = 0; i < 60; i++) app.render();
  assert.deepEqual(app.redirects, ['/dating']);
  const ready = app.render({ path: '/dating' });
  assert.equal(ready.children[1], null);
});

test('errors and disabled shell block interaction without removing navigation', () => {
  const app = harness();
  app.render({ identity: { isError: true, refetch: () => {} } });
  app.render({ identity: { data: 'demo-dates-main', refetch: () => {} }, experience: { isError: true } });
  const disabled = app.render({ experience: { data: { shell: false } } });
  assert.equal(disabled.children[0].props.pointerEvents, 'none');
  assert.deepEqual(app.redirects, []);
});

test('legacy conversation redirects preserve its ID and accepted routes stay put', () => {
  const app = harness();
  app.render({ path: '/chat/demo-match', identity: { data: 'demo-dates-main', refetch: () => {} }, experience: { data: { shell: true } } });
  app.render({ path: '/dating-chat/demo-match' });
  app.render({ path: '/waitlist' });
  app.render({ path: '/questions' });
  assert.deepEqual(app.redirects, ['/dating-chat/demo-match']);
});
