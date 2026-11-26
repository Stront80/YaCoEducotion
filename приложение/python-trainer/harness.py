"""Обвязка учебного запуска. Выполняется внутри браузерного Python Pyodide.

Код ученика получает новое пространство имён. Доступа к реальным файлам ОС
здесь нет; это не защищённая среда для намеренно вредоносных программ.
"""
import builtins
import contextlib
import copy
import io
import json
import traceback


class OutputLimitError(Exception):
    pass


class BoundedOutput(io.StringIO):
    """Ограничиваем вывод до передачи в DOM, включая print без перевода строки."""
    limit = 32000

    def write(self, value):
        available = self.limit - self.tell()
        if len(value) > available:
            super().write(value[:max(0, available)])
            raise OutputLimitError("Вывод ограничен 32000 символами. Сократите печать.")
        return super().write(value)


def trainer_execute(request):
    output = BoundedOutput()
    stream = io.StringIO(request.get("stdin", ""))
    used = 0

    def read_input(prompt=""):
        nonlocal used
        output.write(str(prompt))
        line = stream.readline()
        if line == "":
            raise EOFError("Недостаточно строк для input(). Заполните поле входных данных.")
        used += 1
        return line.rstrip("\n").rstrip("\r")

    student_builtins = dict(vars(builtins))
    student_builtins["input"] = read_input
    namespace = {"__name__": "__main__", "__builtins__": student_builtins}
    result = {"stdout": "", "error": None, "results": [], "inputUsed": 0}
    with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
        try:
            exec(compile(request["source"], "<ученик>", "exec"), namespace)
        except BaseException as error:
            frames = traceback.extract_tb(error.__traceback__)
            line = next((frame.lineno for frame in reversed(frames) if frame.filename == "<ученик>"), None)
            result["error"] = {
                "type": type(error).__name__, "message": str(error)[:2000],
                "line": getattr(error, "lineno", None) or line,
                "column": getattr(error, "offset", None),
            }
        if result["error"] is None:
            # Отдельные проверки не прерывают друг друга, а параметры вызовов
            # копируются: изменение списка внутри функции не портит тестовые данные.
            for spec in request.get("checks", []):
                item = {"label": spec["label"], "pass": False, "detail": ""}
                try:
                    kind = spec["kind"]
                    if kind == "stdout":
                        item["pass"] = output.getvalue() == spec["expected"]
                        if not item["pass"]:
                            item["detail"] = "Сверьте текст, порядок строк и переводы строк."
                    elif kind == "program":
                        outcomes = []
                        for case in spec["cases"]:
                            run = trainer_execute({"source": request["source"], "stdin": case["stdin"], "checks": []})
                            outcomes.append(run["error"] is None and run["stdout"] == case["expected"])
                        item["pass"] = all(outcomes)
                        if not item["pass"]:
                            item["detail"] = "Проверьте программу с разными входными строками и граничными значениями."
                    elif kind == "value":
                        item["pass"] = namespace.get(spec["name"]) == spec["expected"]
                        if not item["pass"]:
                            item["detail"] = "Проверьте значение переменной " + spec["name"] + "."
                    elif kind == "expr":
                        item["pass"] = bool(eval(spec["expression"], namespace))
                    elif kind == "call":
                        function = namespace.get(spec["name"])
                        if not callable(function):
                            raise TypeError("Определите функцию " + spec["name"] + ".")
                        outcomes = []
                        for case in spec["cases"]:
                            actual = function(*copy.deepcopy(case["args"]))
                            outcomes.append(actual == case["expected"])
                        item["pass"] = all(outcomes)
                        if not item["pass"]:
                            item["detail"] = "Функция не прошла все входные примеры, включая граничные."
                    else:
                        raise ValueError("Неизвестный вид учебной проверки.")
                except BaseException as error:
                    item["detail"] = type(error).__name__ + ": " + str(error)[:500]
                result["results"].append(item)
    result["stdout"] = output.getvalue()
    result["inputUsed"] = used
    return result
