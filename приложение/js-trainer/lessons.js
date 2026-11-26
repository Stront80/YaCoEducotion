/* Авторские материалы: проверки результата отделены от интерфейса. */
(function(root){
const lessons=[
  {
    "id": "js-1",
    "group": "Первые строки",
    "title": "Первая строка",
    "topic": "console.log()",
    "theory": "JavaScript выполняет инструкции по порядку. console.log() выводит значение в консоль. Строки заключают в одинарные, двойные или обратные кавычки. Здесь консоль показана под редактором.",
    "task": "Выведите единственную строку «Привет, JavaScript!» с помощью console.log().",
    "hint": "Передайте строку в скобках: console.log(\"текст\").",
    "start": "// Напишите первую инструкцию\n",
    "solution": "console.log(\"Привет, JavaScript!\");",
    "alternative": "console.log('Привет, ' + 'JavaScript!');",
    "checks": [
      {
        "label": "Одно приветствие в выводе",
        "expression": "getOutput() === \"Привет, JavaScript!\\n\""
      }
    ],
    "explanation": "console.log выводит текст и перевод строки. Кавычки обозначают строку и в вывод не попадают."
  },
  {
    "id": "js-2",
    "group": "Первые строки",
    "title": "Переменные и числа",
    "topic": "const · let · арифметика",
    "theory": "const создаёт привязку, которую нельзя переназначить; let — изменяемую переменную. Операторы +, -, * и / работают с числами. Сначала выполняются умножение и деление, скобки меняют порядок. Заготовка function total(price, quantity) объявляет функцию: price и quantity — её входные параметры. return внутри фигурных скобок возвращает результат вызова.",
    "task": "Создайте функцию total(price, quantity), возвращающую стоимость покупки: цену, умноженную на количество. Вызовите её с 150 и 3 через console.log, чтобы увидеть пример.",
    "hint": "Верните результат через return price * quantity;.",
    "start": "function total(price, quantity) {\n  // Верните стоимость\n}\nconsole.log(total(150, 3));",
    "solution": "function total(price, quantity) {\n  const cost = price * quantity;\n  return cost;\n}\nconsole.log(total(150, 3));",
    "alternative": "const total = (p, q) => p * q;\nconsole.log(total(150, 3));",
    "checks": [
      {
        "label": "Обычная покупка",
        "expression": "total(150,3)===450"
      },
      {
        "label": "Ноль и дробная цена",
        "expression": "total(10,0)===0 && total(2.5,4)===10"
      }
    ],
    "explanation": "return отдаёт значение вызывающему коду. console.log показывает пример, но сама функция должна вернуть число."
  },
  {
    "id": "js-3",
    "group": "Первые строки",
    "title": "Строки и шаблоны",
    "topic": "строки · ${...}",
    "theory": "Строки можно объединять через + или шаблонные литералы в обратных кавычках. Внутри шаблона ${выражение} подставляет значение. Параметр функции позволяет использовать один код для разных имён.",
    "task": "Напишите greet(name), возвращающую строку «Привет, ИМЯ!» для переданного имени.",
    "hint": "Шаблон: `Привет, ${name}!`.",
    "start": "function greet(name) {\n  // Верните приветствие\n}\nconsole.log(greet(\"Аня\"));",
    "solution": "function greet(name) {\n  return `Привет, ${name}!`;\n}\nconsole.log(greet(\"Аня\"));",
    "alternative": "const greet = name => \"Привет, \" + name + \"!\";",
    "checks": [
      {
        "label": "Разные имена",
        "expression": "greet(\"Аня\")===\"Привет, Аня!\" && greet(\"Марк\")===\"Привет, Марк!\""
      },
      {
        "label": "Пустая строка",
        "expression": "greet(\"\")===\"Привет, !\""
      }
    ],
    "explanation": "Функция возвращает новую строку. Исходное имя не меняется."
  },
  {
    "id": "js-4",
    "group": "Первые строки",
    "title": "Типы и преобразование",
    "topic": "Number · typeof",
    "theory": "Значения имеют типы: number, string, boolean и другие. Строка \"12\" отличается от числа 12: сложение со строкой может склеить текст. Number(text) явно преобразует строку в число; typeof показывает тип.",
    "task": "Напишите addNumbers(a, b): оба аргумента — строки с числами. Преобразуйте их в числа и верните сумму. Вход всегда корректный.",
    "hint": "Используйте Number(a) + Number(b).",
    "start": "function addNumbers(a, b) {\n  // Сложите как числа\n}\nconsole.log(addNumbers(\"10\", \"2\"));",
    "solution": "function addNumbers(a, b) {\n  return Number(a) + Number(b);\n}\nconsole.log(addNumbers(\"10\", \"2\"));",
    "alternative": "const addNumbers = (a,b) => +a + +b;",
    "checks": [
      {
        "label": "Числа, а не склейка",
        "expression": "addNumbers(\"10\",\"2\")===12"
      },
      {
        "label": "Дроби, отрицательные и ноль",
        "expression": "addNumbers(\"1.5\",\"-2\")===-0.5 && addNumbers(\"0\",\"0\")===0"
      }
    ],
    "explanation": "Number выполняет преобразование целой строки. parseInt здесь не подходит для дробей."
  },
  {
    "id": "js-5",
    "group": "Первые строки",
    "title": "Условия",
    "topic": "if · else · ===",
    "theory": "Условие if выбирает ветку по логическому значению. === сравнивает без приведения типов. Операторы >= и < сравнивают числа. После return выполнение функции заканчивается.",
    "task": "Создайте access(age): если age не меньше 18, верните «можно», иначе «рано». Возраст — неотрицательное число.",
    "hint": "Проверьте границу age >= 18.",
    "start": "function access(age) {\n  // Выберите ответ\n}\nconsole.log(access(18));",
    "solution": "function access(age) {\n  if (age >= 18) return \"можно\";\n  return \"рано\";\n}",
    "alternative": "const access = age => age < 18 ? \"рано\" : \"можно\";",
    "checks": [
      {
        "label": "Граница 18",
        "expression": "access(18)===\"можно\" && access(17)===\"рано\""
      },
      {
        "label": "Другие возраста",
        "expression": "access(0)===\"рано\" && access(42)===\"можно\""
      }
    ],
    "explanation": "Пограничный случай 18 проверяется отдельно: знак > дал бы неверный ответ."
  },
  {
    "id": "js-6",
    "group": "Первые строки",
    "title": "Повторение действий",
    "topic": "for · накопитель",
    "theory": "Цикл for задаёт начальное значение, условие продолжения и шаг. Для накопления результата удобно использовать let. Следите, чтобы условие в итоге стало ложным, иначе цикл не закончится.",
    "task": "Создайте sumTo(n), возвращающую сумму целых чисел от 1 до n включительно. n — целое от 0 до 100. Для n=0 верните 0.",
    "hint": "Начните с let sum = 0; в цикле от 1 до n прибавляйте i.",
    "start": "function sumTo(n) {\n  let sum = 0;\n  // Повторите сложение\n  return sum;\n}",
    "solution": "function sumTo(n) {\n  let sum = 0;\n  for (let i = 1; i <= n; i++) sum += i;\n  return sum;\n}\nconsole.log(sumTo(5));",
    "alternative": "function sumTo(n) { return n * (n + 1) / 2; }",
    "checks": [
      {
        "label": "Суммы для нескольких n",
        "expression": "sumTo(5)===15 && sumTo(10)===55 && sumTo(1)===1"
      },
      {
        "label": "Пустая сумма",
        "expression": "sumTo(0)===0"
      }
    ],
    "explanation": "sum хранит промежуточный результат. Формула тоже корректна: проверка оценивает результат, а цикл — тема разбора."
  },
  {
    "id": "js-7",
    "group": "Функции и данные",
    "title": "Функции и возврат",
    "topic": "параметры · return",
    "theory": "Функция объединяет действие, принимает параметры и возвращает результат. Локальные переменные доступны внутри её тела. У функции без выполненного return результат undefined.",
    "task": "Напишите discount(price, percent): верните цену после скидки. Цена и процент — числа, процент от 0 до 100. Округлять не нужно.",
    "hint": "Цена после скидки: price * (1 - percent / 100).",
    "start": "function discount(price, percent) {\n  // Верните новую цену\n}",
    "solution": "function discount(price, percent) {\n  return price * (1 - percent / 100);\n}\nconsole.log(discount(200, 25));",
    "alternative": "const discount = (p,d) => p - p*d/100;",
    "checks": [
      {
        "label": "Скидка 25%",
        "expression": "discount(200,25)===150"
      },
      {
        "label": "Без скидки и полная скидка",
        "expression": "discount(50,0)===50 && discount(50,100)===0"
      }
    ],
    "explanation": "Процент переводится в долю делением на 100. Возвращайте число, а не строку с валютой."
  },
  {
    "id": "js-8",
    "group": "Функции и данные",
    "title": "Массивы",
    "topic": "[] · for...of",
    "theory": "Массив хранит упорядоченные значения, индексация начинается с нуля. length — длина. for...of перебирает значения. Можно читать массив, не меняя его.",
    "task": "Создайте sumArray(numbers), возвращающую сумму чисел массива. Пустой массив даёт 0. Исходный массив менять нельзя.",
    "hint": "Используйте накопитель и for (const n of numbers).",
    "start": "function sumArray(numbers) {\n  // Сложите элементы\n}",
    "solution": "function sumArray(numbers) {\n  let sum = 0;\n  for (const n of numbers) sum += n;\n  return sum;\n}",
    "alternative": "const sumArray = numbers => numbers.reduce((sum,n)=>sum+n,0);",
    "checks": [
      {
        "label": "Сумма и пустой массив",
        "expression": "sumArray([2,-1,4])===5 && sumArray([])===0"
      },
      {
        "label": "Исходный массив сохранён",
        "expression": "(()=>{const a=[3,1];return sumArray(a)===4 && JSON.stringify(a)===\"[3,1]\";})()"
      }
    ],
    "explanation": "Начальный ноль делает пустой массив корректным. Методы, меняющие массив, здесь не нужны."
  },
  {
    "id": "js-9",
    "group": "Функции и данные",
    "title": "Преобразование массива",
    "topic": "map · стрелочная функция",
    "theory": "map вызывает функцию для каждого элемента и возвращает новый массив той же длины. Стрелочная функция x => x * 2 кратко возвращает выражение. Исходный массив map не изменяет сам по себе.",
    "task": "Создайте double(numbers), возвращающую новый массив удвоенных чисел. Исходный массив должен сохраниться.",
    "hint": "return numbers.map(n => n * 2);",
    "start": "function double(numbers) {\n  // Верните новый массив\n}",
    "solution": "const double = numbers => numbers.map(n => n * 2);\nconsole.log(double([1, 2, 3]));",
    "alternative": "function double(a) { const out=[]; for(const n of a) out.push(n*2); return out; }",
    "checks": [
      {
        "label": "Удвоенные значения",
        "expression": "JSON.stringify(double([1,-2,0]))===\"[2,-4,0]\" && JSON.stringify(double([]))===\"[]\""
      },
      {
        "label": "Новый массив, без изменения входа",
        "expression": "(()=>{const a=[2,4];const b=double(a);return b!==a && JSON.stringify(a)===\"[2,4]\";})()"
      }
    ],
    "explanation": "map подходит, когда каждому исходному элементу соответствует один результат."
  },
  {
    "id": "js-10",
    "group": "Функции и данные",
    "title": "Выбор элементов",
    "topic": "filter · предикат",
    "theory": "filter создаёт новый массив из элементов, для которых функция вернула true. Предикат — функция с логическим результатом. Ноль не является положительным числом.",
    "task": "Напишите positives(numbers): верните только числа строго больше нуля, сохранив порядок. Вход не меняйте.",
    "hint": "Используйте numbers.filter(n => n > 0).",
    "start": "function positives(numbers) {\n  // Отберите положительные\n}",
    "solution": "const positives = numbers => numbers.filter(n => n > 0);",
    "alternative": "function positives(a) {const out=[];for(const n of a)if(n>0)out.push(n);return out;}",
    "checks": [
      {
        "label": "Положительные по порядку",
        "expression": "JSON.stringify(positives([-1,0,3,2,-4]))===\"[3,2]\""
      },
      {
        "label": "Пустой результат и сохранение входа",
        "expression": "(()=>{const a=[0,-2];return positives(a).length===0 && positives([]).length===0 && JSON.stringify(a)===\"[0,-2]\";})()"
      }
    ],
    "explanation": "Проверка n >= 0 включила бы ноль и нарушила условие."
  },
  {
    "id": "js-11",
    "group": "Функции и данные",
    "title": "Объекты",
    "topic": "свойства · деструктуризация",
    "theory": "Объект связывает имена свойств со значениями: {name: \"Аня\", age: 20}. К свойству обращаются через точку или квадратные скобки. Деструктуризация const {name} = user извлекает свойство.",
    "task": "Напишите userLabel(user), возвращающую «ИМЯ · ВОЗРАСТ» из свойств name и age. Входной объект менять нельзя.",
    "hint": "Шаблон `${user.name} · ${user.age}`.",
    "start": "function userLabel(user) {\n  // Составьте подпись\n}",
    "solution": "function userLabel(user) {\n  const {name, age} = user;\n  return `${name} · ${age}`;\n}",
    "alternative": "const userLabel = u => u.name + \" · \" + u.age;",
    "checks": [
      {
        "label": "Поля разных объектов",
        "expression": "userLabel({name:\"Аня\",age:20})===\"Аня · 20\" && userLabel({name:\"Лев\",age:0})===\"Лев · 0\""
      },
      {
        "label": "Объект не изменён",
        "expression": "(()=>{const u={name:\"Мир\",age:8};userLabel(u);return JSON.stringify(u)==='{\"name\":\"Мир\",\"age\":8}';})()"
      }
    ],
    "explanation": "Свойства читаются внутри функции; шаблон автоматически переводит возраст в текст."
  },
  {
    "id": "js-12",
    "group": "Функции и данные",
    "title": "Сводка данных",
    "topic": "reduce · объекты в массиве",
    "theory": "Массив может содержать объекты. reduce сворачивает элементы в одно значение, передавая накопитель следующему шагу. Начальное значение определяет ответ для пустого массива.",
    "task": "Напишите cartTotal(items): каждый объект содержит price и quantity. Верните общую стоимость корзины, пустая корзина даёт 0. Вход не меняйте.",
    "hint": "Сложите item.price * item.quantity для каждого элемента.",
    "start": "function cartTotal(items) {\n  // Посчитайте корзину\n}",
    "solution": "const cartTotal = items => items.reduce((sum, item) => sum + item.price * item.quantity, 0);",
    "alternative": "function cartTotal(items) {let total=0;for(const item of items)total+=item.price*item.quantity;return total;}",
    "checks": [
      {
        "label": "Стоимость корзины и ноль",
        "expression": "cartTotal([{price:10,quantity:2},{price:3,quantity:4}])===32 && cartTotal([])===0"
      },
      {
        "label": "Дробная цена, без изменения входа",
        "expression": "(()=>{const a=[{price:2.5,quantity:2}];const s=JSON.stringify(a);return cartTotal(a)===5 && JSON.stringify(a)===s;})()"
      }
    ],
    "explanation": "Начальный накопитель 0 позволяет обработать пустую корзину и избежать undefined."
  },
  {
    "id": "js-13",
    "group": "Практика языка",
    "title": "Строковые методы",
    "topic": "trim · toLowerCase",
    "theory": "trim убирает пробелы по краям строки, toLowerCase приводит буквы к нижнему регистру. Методы возвращают новые строки. Несколько вызовов можно соединить цепочкой.",
    "task": "Создайте normalize(text), которая убирает пробелы по краям и приводит текст к нижнему регистру. Пробелы внутри оставьте.",
    "hint": "text.trim().toLowerCase()",
    "start": "function normalize(text) {\n  // Нормализуйте текст\n}",
    "solution": "const normalize = text => text.trim().toLowerCase();",
    "alternative": "function normalize(text) {const cleaned=text.trim();return cleaned.toLowerCase();}",
    "checks": [
      {
        "label": "Регистр и края",
        "expression": "normalize(\"  JavaScript  \")===\"javascript\" && normalize(\" ПРИВЕТ Мир \")===\"привет мир\""
      },
      {
        "label": "Пустой текст и внутренние пробелы",
        "expression": "normalize(\"   \")===\"\" && normalize(\" A  B \")===\"a  b\""
      }
    ],
    "explanation": "Нормализация полезна для сравнения пользовательского ввода. Исходная строка остаётся прежней."
  },
  {
    "id": "js-14",
    "group": "Практика языка",
    "title": "JSON",
    "topic": "JSON.parse · JSON.stringify",
    "theory": "JSON — текстовый формат данных. JSON.parse превращает корректный JSON-текст в значение, JSON.stringify делает обратное. В JSON имена свойств и строки записываются в двойных кавычках.",
    "task": "Напишите readNames(json): вход — корректная JSON-строка с массивом объектов {name}. Верните массив имён в том же порядке.",
    "hint": "Сначала JSON.parse(json), затем .map(user => user.name).",
    "start": "function readNames(json) {\n  // Прочитайте данные\n}",
    "solution": "function readNames(json) {\n  const users = JSON.parse(json);\n  return users.map(user => user.name);\n}",
    "alternative": "const readNames = json => {const out=[];for(const u of JSON.parse(json))out.push(u.name);return out;};",
    "checks": [
      {
        "label": "Имена из JSON",
        "expression": "JSON.stringify(readNames('[{\"name\":\"Аня\"},{\"name\":\"Марк\"}]'))==='[\"Аня\",\"Марк\"]'"
      },
      {
        "label": "Пустой массив",
        "expression": "JSON.stringify(readNames(\"[]\"))===\"[]\""
      }
    ],
    "explanation": "JSON.parse не исполняет JavaScript-код. Для неверного JSON он бросает SyntaxError — обработаем её в следующем уроке."
  },
  {
    "id": "js-15",
    "group": "Практика языка",
    "title": "Обработка ошибок",
    "topic": "try · catch",
    "theory": "throw прерывает обычный ход программы. try/catch позволяет обработать ошибку и вернуть понятный результат. Перехватывайте ожидаемые ошибки рядом с операцией, которая может их вызвать.",
    "task": "Создайте safeJSON(text): верните результат JSON.parse(text), а при неверном JSON — null. Корректные значения false, 0 и строки нужно сохранить.",
    "hint": "Поместите return JSON.parse(text) в try, а return null в catch.",
    "start": "function safeJSON(text) {\n  // Обработайте ошибку JSON\n}",
    "solution": "function safeJSON(text) {\n  try { return JSON.parse(text); }\n  catch (error) { return null; }\n}",
    "alternative": "const safeJSON = text => {try {const data=JSON.parse(text);return data;} catch {return null;}};",
    "checks": [
      {
        "label": "Корректные значения",
        "expression": "safeJSON(\"0\")===0 && safeJSON(\"false\")===false && safeJSON('\"текст\"')===\"текст\""
      },
      {
        "label": "Объект и неверный JSON",
        "expression": "safeJSON('{\"ok\":true}').ok===true && safeJSON(\"{\")===null && safeJSON(\"\")===null"
      }
    ],
    "explanation": "Проверка if (!data) потеряла бы допустимые 0 и false. catch срабатывает только при ошибке."
  },
  {
    "id": "js-16",
    "group": "Практика языка",
    "title": "Promise",
    "topic": "Promise.resolve · then",
    "theory": "Promise представляет будущий результат. then получает выполненное значение и возвращает новый Promise. Возврат значения из then передаёт его дальше по цепочке. Асинхронную проверку стенд ожидает автоматически.",
    "task": "Напишите nextNumber(value): верните Promise, который выполняется числом value + 1. value — число. Можно использовать Promise.resolve и then.",
    "hint": "return Promise.resolve(value).then(n => n + 1);",
    "start": "function nextNumber(value) {\n  // Верните Promise\n}",
    "solution": "function nextNumber(value) {\n  return Promise.resolve(value).then(n => n + 1);\n}\nconsole.log(await nextNumber(4));",
    "alternative": "const nextNumber = async value => value + 1;",
    "checks": [
      {
        "label": "Возвращается Promise",
        "expression": "(()=>{const p=nextNumber(1);return p instanceof Promise;})()"
      },
      {
        "label": "Асинхронный результат",
        "expression": "(await nextNumber(4))===5 && (await nextNumber(-1))===0"
      }
    ],
    "explanation": "Обычный return value + 1 вернул бы число сразу. Здесь контракт явно требует Promise."
  },
  {
    "id": "js-17",
    "group": "Практика языка",
    "title": "Ожидание результата",
    "topic": "async · await",
    "theory": "async-функция всегда возвращает Promise. await ожидает Promise и даёт его значение; при отклонении бросает ошибку. В редакторе допустим верхнеуровневый await: код обёрнут в async-функцию.",
    "task": "Создайте async-функцию sumAsync(a, b). a и b — Promise с числами. Дождитесь обоих и верните сумму.",
    "hint": "const first = await a; const second = await b; return first + second;",
    "start": "async function sumAsync(a, b) {\n  // Дождитесь значений\n}",
    "solution": "async function sumAsync(a, b) {\n  const first = await a;\n  const second = await b;\n  return first + second;\n}\nconsole.log(await sumAsync(Promise.resolve(2), Promise.resolve(3)));",
    "alternative": "const sumAsync = async (a,b) => {const values=await Promise.all([a,b]);return values[0]+values[1];};",
    "checks": [
      {
        "label": "Сумма обещанных чисел",
        "expression": "(await sumAsync(Promise.resolve(2),Promise.resolve(3)))===5"
      },
      {
        "label": "Ноль и отрицательное число",
        "expression": "(await sumAsync(Promise.resolve(0),Promise.resolve(-4)))===-4"
      }
    ],
    "explanation": "Promise нельзя складывать как числа: сначала извлеките значения через await. Реальные сетевые запросы здесь не используются."
  },
  {
    "id": "js-18",
    "group": "Практика языка",
    "title": "Проверка входных данных",
    "topic": "Number.isFinite · throw",
    "theory": "Валидация проверяет вход до вычислений. Number.isFinite принимает только конечные числа; строки, NaN и Infinity отклоняются. Error сообщает причину. Конкретный вид ошибки может быть частью контракта функции.",
    "task": "Напишите square(value). Для конечного числа верните квадрат. Для строки, NaN и Infinity бросьте TypeError. Отрицательные числа допустимы.",
    "hint": "if (!Number.isFinite(value)) throw new TypeError(\"Нужно конечное число\");",
    "start": "function square(value) {\n  // Проверьте и возведите в квадрат\n}",
    "solution": "function square(value) {\n  if (!Number.isFinite(value)) throw new TypeError(\"Нужно конечное число\");\n  return value * value;\n}",
    "alternative": "const square = value => {if(typeof value!==\"number\" || !isFinite(value))throw new TypeError(\"Число\");return value**2;};",
    "checks": [
      {
        "label": "Числа",
        "expression": "square(-3)===9 && square(0)===0 && square(2.5)===6.25"
      },
      {
        "label": "Неверные входы дают TypeError",
        "expression": "[\"3\",NaN,Infinity].every(value=>{try{square(value);return false;}catch(e){return e instanceof TypeError;}})"
      }
    ],
    "explanation": "Глобальная isFinite приводит типы: отдельно проверяйте typeof или используйте Number.isFinite."
  },
  {
    "id": "js-19",
    "group": "Итоговый проект",
    "title": "Анализатор расходов",
    "topic": "функции · массивы · объекты",
    "theory": "Соберём изученное в чистую функцию: результат зависит от аргументов, входные данные не меняются. Разделяйте фильтрацию и подсчёт. Пустой набор — полноценный сценарий, который нужно обработать.",
    "task": "Создайте summarize(expenses). Вход — массив объектов {category: строка, amount: число}. Учитывайте только конечные числа amount строго больше 0. Верните {total, count, byCategory}, где byCategory — объект сумм по категориям. Пустой вход даёт {total:0,count:0,byCategory:{}}. Вход не меняйте; категории могут называться «__proto__» и «constructor».",
    "hint": "Отберите записи через Number.isFinite. Для категорий удобно накопить Map, затем Object.fromEntries. Это также корректно обрабатывает специальные имена свойств.",
    "start": "function summarize(expenses) {\n  // Отберите записи и соберите сводку\n}\nconsole.log(summarize([\n  {category: \"Еда\", amount: 250},\n  {category: \"Транспорт\", amount: 80},\n  {category: \"Еда\", amount: 120}\n]));",
    "solution": "function summarize(expenses) {\n  let total = 0;\n  let count = 0;\n  const groups = new Map();\n  for (const item of expenses) {\n    if (!Number.isFinite(item.amount) || item.amount <= 0) continue;\n    total += item.amount;\n    count++;\n    groups.set(item.category, (groups.get(item.category) || 0) + item.amount);\n  }\n  return {total, count, byCategory: Object.fromEntries(groups)};\n}\nconsole.log(summarize([{category:\"Еда\",amount:250},{category:\"Еда\",amount:120}]));",
    "alternative": "const summarize = expenses => {const valid=expenses.filter(e=>Number.isFinite(e.amount)&&e.amount>0);const byCategory=Object.create(null);for(const e of valid)byCategory[e.category]=(byCategory[e.category]??0)+e.amount;return {total:valid.reduce((s,e)=>s+e.amount,0),count:valid.length,byCategory};};",
    "checks": [
      {
        "label": "Сумма, количество и категории",
        "expression": "(()=>{const r=summarize([{category:\"Еда\",amount:250},{category:\"Путь\",amount:80},{category:\"Еда\",amount:120}]);return r.total===450&&r.count===3&&r.byCategory[\"Еда\"]===370&&r.byCategory[\"Путь\"]===80;})()"
      },
      {
        "label": "Фильтрация и пустой вход",
        "expression": "(()=>{const r=summarize([{category:\"x\",amount:-1},{category:\"x\",amount:0},{category:\"x\",amount:\"5\"},{category:\"x\",amount:NaN},{category:\"x\",amount:Infinity}]);const e=summarize([]);return r.total===0&&r.count===0&&Object.keys(r.byCategory).length===0&&e.total===0&&e.count===0&&Object.keys(e.byCategory).length===0;})()"
      },
      {
        "label": "Специальные имена, вход сохранён",
        "expression": "(()=>{const a=[{category:\"__proto__\",amount:2},{category:\"constructor\",amount:3},{category:\"__proto__\",amount:4}];const before=JSON.stringify(a);const r=summarize(a);return r.total===9&&r.count===3&&r.byCategory[\"__proto__\"]===6&&r.byCategory.constructor===3&&JSON.stringify(a)===before;})()"
      }
    ],
    "explanation": "Map не смешивает ключи категорий с прототипом объекта. Object.fromEntries создаёт собственные свойства, включая __proto__. Для денег в реальных приложениях отдельно выбирают правила точности и округления."
  }
];
if(typeof module!=="undefined")module.exports={lessons};else root.JSCourse={lessons};
})(globalThis);
