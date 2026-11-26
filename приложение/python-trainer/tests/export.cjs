// Только сериализация авторских материалов для тестов CPython.
process.stdout.write(JSON.stringify(require('../lessons.js').lessons));
