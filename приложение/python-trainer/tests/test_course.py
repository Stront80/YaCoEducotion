"""Проверки собственных учебных примеров. Пользовательский код здесь не запускается."""
import importlib.util
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("harness", ROOT / "harness.py")
harness = importlib.util.module_from_spec(spec)
spec.loader.exec_module(harness)
LESSONS = json.loads(subprocess.check_output(["node", str(ROOT / "tests/export.cjs")], text=True))


def run(lesson, source):
    return harness.trainer_execute({"source": source, "stdin": lesson["stdin"], "checks": lesson["checks"]})


def passed(result):
    return not result["error"] and result["results"] and all(item["pass"] for item in result["results"])


class CourseTests(unittest.TestCase):
    def test_structure(self):
        self.assertEqual(len(LESSONS), 19)
        self.assertEqual(len({l["id"] for l in LESSONS}), 19)
        for lesson in LESSONS:
            for key in ["title", "theory", "task", "hint", "solution", "alternative", "explanation"]:
                self.assertTrue(lesson[key].strip(), (lesson["id"], key))
            self.assertTrue(lesson["checks"])

    def test_all_lessons(self):
        for lesson in LESSONS:
            with self.subTest(id=lesson["id"]):
                for key in ["solution", "alternative"]:
                    result = run(lesson, lesson[key])
                    self.assertTrue(passed(result), (key, result))
                self.assertFalse(passed(run(lesson, lesson["start"])))
                self.assertFalse(passed(run(lesson, 'print("Неверный ответ")\n')))

    def test_errors_and_line_numbers(self):
        for source, kind, line in [("x = 0\nprint(1 / x)", "ZeroDivisionError", 2), ("print(missing)", "NameError", 1), ("if True\n    print(1)", "SyntaxError", 1)]:
            r = harness.trainer_execute({"source": source})
            self.assertEqual(r["error"]["type"], kind)
            self.assertEqual(r["error"]["line"], line)

    def test_input_and_output(self):
        r = harness.trainer_execute({"source": 'print(input("Имя: "))\nprint(input())', "stdin": "Анна\n\n"})
        self.assertEqual(r["stdout"], "Имя: Анна\n\n")
        self.assertEqual(r["inputUsed"], 2)
        r = harness.trainer_execute({"source": "input()"})
        self.assertEqual(r["error"]["type"], "EOFError")
        r = harness.trainer_execute({"source": 'print("x" * 32001)'})
        self.assertEqual(r["error"]["type"], "OutputLimitError")
        self.assertEqual(len(r["stdout"]), 32000)

    def test_namespaces_are_fresh(self):
        harness.trainer_execute({"source": "secret = 123"})
        r = harness.trainer_execute({"source": "print(secret)"})
        self.assertEqual(r["error"]["type"], "NameError")


if __name__ == "__main__":
    unittest.main(verbosity=2)
