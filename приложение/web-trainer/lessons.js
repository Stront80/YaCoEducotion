/* Учебные материалы отделены от интерфейса. Проверки запускаются в sandbox,
   поэтому здесь нет обращения к хранилищу или DOM основного приложения. */
(() => {
  const code = (html = '', css = '', js = '') => ({html, css, js});
  const test = (label, expression) => ({label, expression});
  const has = (selector, text) => `!!document.querySelector(${JSON.stringify(selector)})${text ? ` && document.querySelector(${JSON.stringify(selector)}).textContent.includes(${JSON.stringify(text)})` : ''}`;
  const lessons = [];
  function add(id, group, title, theory, task, hint, start, solution, tests, explanation) {
    lessons.push({id, group, title, theory, task, hint, start, solution, tests, explanation});
  }
  add('html-1','HTML','Первая страница',
    'HTML описывает смысл и структуру страницы. Контент находится внутри body, а название вкладки — в title внутри head. <!doctype html> включает современный режим браузера.',
    'Создайте полный HTML-документ: doctype, html с lang="ru", head с title «Моя страница» и body с заголовком h1 «Привет, веб!».',
    'Открывающий и закрывающий теги образуют пару: <title>Моя страница</title>. Внутри html находятся head и body.',
    code('<!doctype html>\n<html lang="ru">\n<head>\n  <title></title>\n</head>\n<body>\n  <!-- Добавьте заголовок -->\n</body>\n</html>'),
    code('<!doctype html>\n<html lang="ru">\n<head><title>Моя страница</title></head>\n<body><h1>Привет, веб!</h1></body>\n</html>'),
    [test('Современный документ на русском', '/<!doctype\\s+html\\s*>/i.test(source.html) && /<head[\\s>]/i.test(source.html) && /<body[\\s>]/i.test(source.html) && document.documentElement.lang === "ru"'),test('У страницы есть название', 'document.title === "Моя страница"'),test('Приветствие в h1',has('body h1','Привет, веб!'))],
    'head хранит сведения о документе, body — видимое содержимое. Заголовок h1 обозначает главную тему.');
  add('html-2','HTML','Заголовки и абзацы',
    'h1 — главный заголовок, h2 — заголовок раздела, p — абзац. Используйте уровни по смыслу: размер текста позже задаётся CSS.',
    'Добавьте h1 «Обо мне», h2 «Мой первый шаг» и два непустых абзаца о себе.',
    'Каждую мысль поместите в отдельный <p>...</p>.',code('<main>\n  <!-- Представьтесь -->\n</main>'),
    code('<main>\n  <h1>Обо мне</h1>\n  <h2>Мой первый шаг</h2>\n  <p>Я учусь создавать сайты.</p>\n  <p>Сегодня я написал первую страницу.</p>\n</main>'),
    [test('Главный заголовок',has('h1','Обо мне')),test('Заголовок раздела',has('h2','Мой первый шаг')),test('Два содержательных абзаца','[...document.querySelectorAll("p")].filter(p=>p.textContent.trim()).length >= 2')],
    'HTML задаёт структуру текста. Абзацы удобнее читать и оформлять, чем текст с множеством переносов br.');
  add('html-3','HTML','Ссылки и навигация',
    'Ссылка a с атрибутом href ведёт к адресу или разделу страницы. Значение #practice ссылается на элемент с id="practice". Текст ссылки должен объяснять переход.',
    'В nav добавьте ссылку «К практике» с href="#practice". Ниже создайте section с id="practice" и заголовком h2.',
    'id уникален на странице. В href перед именем ставится #.',code('<nav></nav>\n<main></main>'),
    code('<nav><a href="#practice">К практике</a></nav>\n<main><section id="practice"><h2>Практика</h2></section></main>'),
    [test('Понятная ссылка в навигации',has('nav a[href="#practice"]','К практике')),test('Целевой раздел с заголовком',has('section#practice h2'))],
    'Ссылка связывает навигацию и раздел без JavaScript. Для действий на текущем экране обычно используется button.');
  add('html-4','HTML','Изображения и alt',
    'img показывает изображение. src задаёт источник, alt передаёт его смысл, если изображение недоступно или используется программа чтения с экрана. figure и figcaption объединяют изображение с подписью.',
    'Поместите в figure изображение hello.svg с alt «Окно с кодом» и непустую подпись figcaption. В тренажёре доступно локальное изображение hello.svg.',
    'img — одиночный тег: <img src="hello.svg" alt="Окно с кодом">.',code('<figure>\n  <!-- Изображение и подпись -->\n</figure>'),
    code('<figure>\n  <img src="hello.svg" alt="Окно с кодом">\n  <figcaption>Моя веб-мастерская</figcaption>\n</figure>'),
    [test('Изображение с осмысленным alt','document.querySelector("figure img")?.alt === "Окно с кодом"'),test('Изображение загрузилось','!!document.querySelector("figure img")?.naturalWidth'),test('Есть подпись','!!document.querySelector("figcaption")?.textContent.trim()')],
    'Подпись видна всем, alt описывает изображение для альтернативного представления. Внешние изображения в тренажёре заблокированы.');
  add('html-5','HTML','Списки',
    'ul — список без заданного порядка, ol — последовательность шагов. Каждый пункт оформляется li. Список помогает браузеру и читателю распознать связанную группу элементов.',
    'Создайте ul с тремя непустыми пунктами инструментов и ol с двумя непустыми шагами обучения.',
    'Вложите li непосредственно внутрь ul или ol.',code('<h1>Мой план</h1>'),
    code('<h1>Мой план</h1>\n<ul><li>Браузер</li><li>Редактор</li><li>Блокнот</li></ul>\n<ol><li>Изучить пример</li><li>Написать свой код</li></ol>'),
    [test('Три инструмента','[...document.querySelectorAll("ul > li")].filter(e=>e.textContent.trim()).length >= 3'),test('Два шага','[...document.querySelectorAll("ol > li")].filter(e=>e.textContent.trim()).length >= 2')],
    'Выбирайте ol, когда порядок важен; ul — когда пункты можно переставить.');
  add('html-6','HTML','Форма с подписями',
    'Форма объединяет поля ввода. label связывается с полем через for и id. type="email" включает встроенную проверку адреса, required запрещает пустое значение.',
    'Создайте form: label «Почта» для input с id="email", type="email", name="email" и required. Добавьте кнопку отправки с понятным текстом. Форма учебная, данные никуда не отправляются.',
    'Используйте <label for="email">Почта</label> и <button type="submit">Готово</button>.',code('<form>\n</form>'),
    code('<form>\n  <label for="email">Почта</label>\n  <input id="email" name="email" type="email" required>\n  <button type="submit">Готово</button>\n</form>'),
    [test('Подписанное поле email','!!document.querySelector("form input#email[type=email][name=email][required]") && !!document.querySelector("label[for=email]")?.textContent.includes("Почта")'),test('Кнопка отправки','!!document.querySelector("form button[type=submit]")?.textContent.trim()')],
    'Подпись остаётся видимой и после ввода. placeholder не заменяет label. Для реальной отправки потребуется сервер.');

  const card = '<article class="card"><h1>Моя карточка</h1><p>Учусь создавать веб.</p></article>';
  add('css-1','CSS','Селекторы и цвет',
    'CSS-правило состоит из селектора и деклараций: .card { color: blue; }. Точка выбирает класс. color задаёт цвет текста, background-color — фон.',
    'Задайте карточке .card фон #e8edff и цвет текста #18233b.',
    'Запишите оба свойства внутри .card { ... }. Можно использовать эквивалентные RGB-значения.',code(card,'.card {\n  /* Добавьте цвета */\n}'),
    code(card,'.card { background-color: #e8edff; color: #18233b; }'),
    [test('Светло-синий фон','getComputedStyle(document.querySelector(".card")).backgroundColor === "rgb(232, 237, 255)"'),test('Тёмный текст','getComputedStyle(document.querySelector(".card")).color === "rgb(24, 35, 59)"')],
    'Проверяется вычисленный цвет, поэтому короткая запись и эквивалентный rgb тоже подходят.');
  add('css-2','CSS','Читаемый текст',
    'font-size задаёт размер, line-height — высоту строки. Значение line-height без единиц масштабируется вместе со шрифтом. Текст должен оставаться удобным при увеличении.',
    'Для .card установите размер текста 20px, высоту строки 1.6 и выравнивание слева.',
    'font-size: 20px; line-height: 1.6; text-align: left;',code(card,'.card { }'),
    code(card,'.card { font-size: 20px; line-height: 1.6; text-align: left; }'),
    [test('Размер 20px','getComputedStyle(document.querySelector(".card")).fontSize === "20px"'),test('Высота строки 32px','getComputedStyle(document.querySelector(".card")).lineHeight === "32px"'),test('Выравнивание слева','getComputedStyle(document.querySelector(".card")).textAlign === "left"')],
    'При размере 20px множитель 1.6 даёт строку высотой 32px. Заголовки могут иметь собственный размер.');
  add('css-3','CSS','Блочная модель',
    'Контент окружён padding (внутренним отступом), border (рамкой) и margin (внешним отступом). box-sizing: border-box включает padding и рамку в заданную ширину.',
    'Для .card задайте width: 280px, padding: 24px, сплошную рамку 2px и box-sizing: border-box.',
    'Рамку можно задать сокращением border: 2px solid #3456d4.',code(card,'.card { }'),
    code(card,'.card { width: 280px; padding: 24px; border: 2px solid #3456d4; box-sizing: border-box; }'),
    [test('Ширина включает рамку','getComputedStyle(document.querySelector(".card")).boxSizing === "border-box" && getComputedStyle(document.querySelector(".card")).width === "280px"'),test('Отступ со всех сторон','["Top","Right","Bottom","Left"].every(s=>getComputedStyle(document.querySelector(".card"))["padding"+s] === "24px")'),test('Сплошная рамка 2px','["Top","Right","Bottom","Left"].every(s=>{const c=getComputedStyle(document.querySelector(".card"));return c["border"+s+"Width"] === "2px" && c["border"+s+"Style"] === "solid"})')],
    'border-box помогает предсказать размер карточки: внешняя ширина остаётся 280px.');
  const items = '<div class="items"><div>HTML</div><div>CSS</div><div>JS</div></div>';
  add('css-4','CSS','Расположение с Flexbox',
    'display: flex располагает дочерние элементы вдоль оси. justify-content управляет распределением по главной оси, align-items — по поперечной. gap задаёт промежуток.',
    'Превратите .items в flex-контейнер: горизонтальный ряд, центрирование по обеим осям, gap 16px.',
    'Нужны display, flex-direction, justify-content, align-items и gap.',code(items,'.items { min-height: 140px; }'),
    code(items,'.items { min-height: 140px; display: flex; flex-direction: row; justify-content: center; align-items: center; gap: 16px; }'),
    [test('Горизонтальный flex','getComputedStyle(document.querySelector(".items")).display === "flex" && getComputedStyle(document.querySelector(".items")).flexDirection === "row"'),test('Центрирование','getComputedStyle(document.querySelector(".items")).justifyContent === "center" && getComputedStyle(document.querySelector(".items")).alignItems === "center"'),test('Промежутки 16px','getComputedStyle(document.querySelector(".items")).gap === "16px"')],
    'Flexbox особенно удобен для строки кнопок или навигации.');
  add('css-5','CSS','Сетка Grid',
    'Grid управляет строками и колонками. repeat(3, 1fr) создаёт три равные колонки, делящие доступное место. gap оставляет расстояние между ячейками.',
    'Создайте для .items сетку из трёх равных колонок с промежутком 12px.',
    'display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;',code(items,'.items { }'),
    code(items,'.items { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }'),
    [test('Grid-контейнер','getComputedStyle(document.querySelector(".items")).display === "grid"'),test('Три равные колонки','(()=>{const a=getComputedStyle(document.querySelector(".items")).gridTemplateColumns.split(" ").map(parseFloat);return a.length===3 && a.every(n=>n>0 && Math.abs(n-a[0])<1)})()'),test('Промежуток 12px','getComputedStyle(document.querySelector(".items")).gap === "12px"')],
    'fr описывает долю свободного места. Равные колонки можно задать и другими эквивалентными способами.');
  add('css-6','CSS','Адаптивная карточка',
    'Медиазапрос применяет стили при условии, например @media (max-width: 600px). Адаптивная ширина не должна выходить за границы родителя.',
    'Карточка: width 100%, max-width 480px, border-box, padding 24px. При ширине окна до 600px включительно уменьшите padding до 12px.',
    'Внутри @media (max-width: 600px) переопределите .card. Проверка дополнительно проверит узкую область.',code(card,'.card { }'),
    code(card,'.card { width: 100%; max-width: 480px; box-sizing: border-box; padding: 24px; }\n@media (max-width: 600px) { .card { padding: 12px; } }'),
    [test('Ограниченная адаптивная ширина','(()=>{const e=document.querySelector(".card"),c=getComputedStyle(e);return c.maxWidth==="480px" && c.boxSizing==="border-box" && Math.abs(e.getBoundingClientRect().width-Math.min(480,document.body.clientWidth))<2})()'),test('Отступ зависит от ширины','["Top","Right","Bottom","Left"].every(s=>getComputedStyle(document.querySelector(".card"))["padding"+s] === (innerWidth<=600 ? "12px":"24px"))')],
    'Сначала задаётся базовое оформление, затем узкий экран переопределяет только нужные свойства.');

  const output = '<h1>Практика JavaScript</h1>\n<p id="output">Здесь появится результат</p>';
  add('js-1','JavaScript','Переменные и значения',
    'const хранит значение, которое не переназначают; let позволяет менять его. Строки заключают в кавычки. textContent записывает текст в элемент страницы.',
    'Создайте переменную name со значением «Мир» и выведите «Привет, Мир!» в #output, используя это значение.',
    'document.querySelector("#output").textContent = "Привет, " + name + "!";',code(output,'','// Создайте переменную и выведите приветствие'),
    code(output,'','const name = "Мир";\ndocument.querySelector("#output").textContent = "Привет, " + name + "!";'),
    [test('Переменная name содержит Мир','typeof name !== "undefined" && name === "Мир"'),test('Приветствие на странице',has('#output','Привет, Мир!'))],
    'Значение переменной можно использовать в разных выражениях. Для безопасного вывода обычного текста используйте textContent.');
  add('js-2','JavaScript','Условия',
    'if выбирает ветку по условию. Оператор >= означает «больше или равно». Функция может возвращать разные значения для разных аргументов.',
    'Напишите функцию access(age): для 18 лет и старше верните «Можно», иначе «Рано». Выведите access(18) в #output.',
    'Внутри функции: if (age >= 18) return "Можно"; return "Рано";',code(output,'','function access(age) {\n  // Верните результат проверки\n}\n'),
    code(output,'','function access(age) {\n  if (age >= 18) return "Можно";\n  return "Рано";\n}\ndocument.querySelector("#output").textContent = access(18);'),
    [test('Граница возраста и разные значения','typeof access === "function" && access(18)==="Можно" && access(25)==="Можно" && access(17)==="Рано" && access(0)==="Рано"'),test('Результат показан',has('#output','Можно'))],
    'Проверка нескольких значений помогает найти ошибку на границе: 18 уже должно попадать в разрешённую ветку.');
  add('js-3','JavaScript','Функции',
    'Функция получает параметры и возвращает результат через return. Это позволяет повторно использовать вычисление для разных входных данных.',
    'Создайте функцию total(price, count), возвращающую произведение. Выведите total(120, 3) в #output.',
    'function total(price, count) { return price * count; }',code(output,'','// Определите total и покажите сумму'),
    code(output,'','function total(price, count) { return price * count; }\ndocument.querySelector("#output").textContent = total(120, 3);'),
    [test('Функция считает разные покупки','typeof total === "function" && total(120,3)===360 && total(7,4)===28 && total(9,0)===0'),test('На странице 360','document.querySelector("#output").textContent.trim() === "360"')],
    'Возвращаемое значение отделяет расчёт от отображения. Функцию можно проверить без чтения страницы.');
  add('js-4','JavaScript','Массивы и циклы',
    'Массив хранит последовательность значений. for...of перебирает их. Для накопления суммы заведите let result = 0 и добавляйте каждый элемент.',
    'Напишите функцию sum(numbers), возвращающую сумму массива (для пустого — 0). Выведите sum([2, 4, 6]) в #output.',
    'В цикле for (const number of numbers) используйте result += number.',code(output,'','function sum(numbers) {\n  // Просуммируйте элементы\n}\n'),
    code(output,'','function sum(numbers) {\n  let result = 0;\n  for (const number of numbers) result += number;\n  return result;\n}\ndocument.querySelector("#output").textContent = sum([2, 4, 6]);'),
    [test('Сумма разных массивов','typeof sum === "function" && sum([2,4,6])===12 && sum([])===0 && sum([-2,5])===3'),test('На странице 12','document.querySelector("#output").textContent.trim() === "12"')],
    'Пустой массив не выполняет тело цикла, поэтому начальное значение 0 становится результатом. reduce — тоже корректное решение.');
  add('js-5','JavaScript','Создание элементов DOM',
    'DOM — представление документа в виде объектов. createElement создаёт узел, textContent задаёт текст, append добавляет его на страницу.',
    'Из массива topics создайте внутри #topics по одному li для HTML, CSS и JavaScript. Используйте создание элементов, а не ручное изменение HTML-разметки.',
    'Для каждой темы создайте document.createElement("li"), задайте textContent и добавьте в список.',code('<h1>Темы</h1>\n<ul id="topics"></ul>','','const topics = ["HTML", "CSS", "JavaScript"];\n// Заполните список'),
    code('<h1>Темы</h1>\n<ul id="topics"></ul>','','const topics = ["HTML", "CSS", "JavaScript"];\nfor (const topic of topics) {\n  const item = document.createElement("li");\n  item.textContent = topic;\n  document.querySelector("#topics").append(item);\n}'),
    [test('Три темы в правильном порядке','JSON.stringify([...document.querySelectorAll("#topics > li")].map(e=>e.textContent.trim())) === JSON.stringify(["HTML","CSS","JavaScript"])')],
    'textContent сохраняет текст как текст, даже если он содержит угловые скобки. Проверка оценивает список; способ реализации можно сверить с решением.');
  add('js-6','JavaScript','События и счётчик',
    'addEventListener связывает событие и функцию-обработчик. Событие click возникает при нажатии кнопки мышью, касанием или клавиатурой.',
    'При каждом нажатии #increment увеличивайте число в #count на 1. Начальное значение — 0.',
    'Храните let count = 0. В обработчике увеличьте count и обновите textContent.',code('<h1>Мой счётчик</h1>\n<p id="count">0</p>\n<button id="increment">Добавить</button>','','// Подключите обработчик'),
    code('<h1>Мой счётчик</h1>\n<p id="count">0</p>\n<button id="increment">Добавить</button>','','let count = 0;\ndocument.querySelector("#increment").addEventListener("click", () => {\n  count += 1;\n  document.querySelector("#count").textContent = count;\n});'),
    [test('Счёт начинается с нуля','document.querySelector("#count").textContent.trim() === "0"'),test('Три нажатия дают 1, 2, 3','(()=>{const b=document.querySelector("#increment"),o=document.querySelector("#count");return [1,2,3].every(n=>{b.click();return o.textContent.trim()===String(n)})})()')],
    'Обработчик вызывается при каждом нажатии. Проверка нажимает кнопку несколько раз, поэтому в результате после проверки будет 3.');

  const projectHtml = '<h1>Мои задачи</h1>\n<form id="task-form">\n  <label for="task-input">Новая задача</label>\n  <input id="task-input" autocomplete="off">\n  <button type="submit">Добавить</button>\n</form>\n<ul id="tasks"></ul>';
  const projectCss = 'body { font-family: system-ui, sans-serif; padding: 24px; color: #18233b; }\nli { display: flex; align-items: center; gap: 12px; margin: 12px 0; }\nli.done span { text-decoration: line-through; }';
  const projectJs = 'const form = document.querySelector("#task-form");\nconst input = document.querySelector("#task-input");\nconst list = document.querySelector("#tasks");\nform.addEventListener("submit", event => {\n  event.preventDefault();\n  const text = input.value.trim();\n  if (!text) return;\n  const item = document.createElement("li");\n  const checkbox = document.createElement("input");\n  checkbox.type = "checkbox";\n  checkbox.setAttribute("aria-label", "Выполнено: " + text);\n  const label = document.createElement("span");\n  label.textContent = text;\n  const remove = document.createElement("button");\n  remove.textContent = "Удалить";\n  remove.type = "button";\n  remove.addEventListener("click", () => item.remove());\n  checkbox.addEventListener("change", () => item.classList.toggle("done", checkbox.checked));\n  item.append(checkbox, label, remove);\n  list.append(item);\n  input.value = "";\n});';
  add('project','Проект','Список задач',
    'Объедините структуру HTML, оформление CSS и события JavaScript. Используйте готовые идентификаторы формы и списка: они нужны для проверки поведения. Данные списка живут только до следующего запуска; сам код проекта сохраняется.',
    'Реализуйте добавление задачи через форму #task-form, отклонение пустого ввода, отметку checkbox и удаление кнопкой в каждом li. Текст выводите в span через textContent. Для выполненного li включайте класс done, который зачёркивает текст.',
    'На submit вызовите preventDefault(), обрежьте пробелы через trim(). Создайте li, checkbox, span и кнопку удаления. На change переключайте класс done.',
    code(projectHtml,projectCss,'// Здесь будет логика вашего приложения'), code(projectHtml,projectCss,projectJs),
    [test('Форма и подпись','!!document.querySelector("#task-form label[for=task-input]") && !!document.querySelector("#task-input") && !!document.querySelector("#tasks")'),
      test('Пустые задачи не добавляются','(()=>{const l=document.querySelector("#tasks"),n=l.children.length;document.querySelector("#task-input").value="   ";document.querySelector("#task-form").requestSubmit();return l.children.length===n})()'),
      test('Добавление двух задач и безопасный текст','(()=>{const f=document.querySelector("#task-form"),i=document.querySelector("#task-input"); for(const text of ["Изучить HTML","<b>Практика</b>"]){i.value=text;f.requestSubmit()} const a=[...document.querySelectorAll("#tasks li")];return a.length===2 && a[0].querySelector("span")?.textContent==="Изучить HTML" && a[1].querySelector("span")?.textContent==="<b>Практика</b>" && !a[1].querySelector("b") && i.value===""})()'),
      test('Отметка и отмена выполнения','(()=>{const e=document.querySelector("#tasks li"),c=e.querySelector("input[type=checkbox]");c.click();const yes=e.classList.contains("done") && getComputedStyle(e.querySelector("span")).textDecorationLine.includes("line-through");c.click();return yes && !e.classList.contains("done")})()'),
      test('Удаление одной задачи сохраняет другую','(()=>{document.querySelector("#tasks li button").click();const a=document.querySelectorAll("#tasks li");return a.length===1 && a[0].textContent.includes("<b>Практика</b>")})()')],
    'Это маленькое приложение с вводом, состоянием и действиями. Проверка создаёт тестовые задачи. Чтобы начать с чистого списка, нажмите «Запустить».');
  window.TrainerLessons = lessons;
})();
