// Быстрая проверка структуры курса без зависимостей и браузера.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'lessons.js'), 'utf8'), context);
const lessons = context.window.TrainerLessons;
assert.equal(lessons.length, 19);
assert.equal(new Set(lessons.map(l=>l.id)).size, 19);
for (const group of ['HTML','CSS','JavaScript']) assert.equal(lessons.filter(l=>l.group===group).length, 6);
for (const lesson of lessons) {
  for (const key of ['id','group','title','theory','task','hint','explanation']) assert.ok(lesson[key]?.trim(), `${lesson.id}: ${key}`);
  for (const key of ['start','solution']) for (const lang of ['html','css','js']) assert.equal(typeof lesson[key][lang], 'string');
  assert.ok(lesson.tests.length);
  for (const item of lesson.tests) {
    assert.ok(item.label.trim());
    new Function('source', `return (${item.expression})`);
  }
  new vm.Script(lesson.solution.js);
}
console.log('19 занятий: структура, уникальные ID, проверки и синтаксис решений — OK');
