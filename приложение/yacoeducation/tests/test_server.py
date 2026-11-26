"""Чистые проверки реестра/разрешения путей, без сетевого bind и изменений курсов."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("education_server", ROOT / "serve.py")
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)


class RegistryTests(unittest.TestCase):
    def setUp(self):
        self.raw = json.loads((ROOT / "workshops.json").read_text())
        self.public, self.sources = server.load_registry()

    def load(self, value):
        with tempfile.TemporaryDirectory(prefix="education-registry-") as directory:
            path = Path(directory) / "workshops.json"
            # Относительные source вычисляются от временной копии реестра.
            value = copy.deepcopy(value)
            for entry in value["workshops"]:
                folder = (ROOT / entry["source"]).resolve()
                entry["source"] = os.path.relpath(folder, path.parent)
            path.write_text(json.dumps(value))
            return server.load_registry(path)

    def test_seven_and_133(self):
        self.assertEqual(len(self.public["workshops"]), 7)
        self.assertEqual(sum(w["lessonCount"] for w in self.public["workshops"]), 133)
        self.assertNotIn("source", json.dumps(self.public))

    def test_each_source_and_resources(self):
        for course in self.public["workshops"]:
            path = server.resource_path(course["url"], self.sources)
            self.assertEqual(path.name, "index.html")
            self.assertTrue(path.is_file())
            self.assertTrue(server.resource_path(course["url"] + "app.js", self.sources).is_file())

    def test_vendor_and_harness(self):
        for name in ["worker.mjs", "harness.py", "vendor/pyodide/pyodide.mjs", "vendor/pyodide/pyodide.asm.wasm", "vendor/pyodide/python_stdlib.zip"]:
            self.assertTrue(server.resource_path("/workshops/python/" + name, self.sources).is_file())

    def test_traversal_and_encodings(self):
        for path in ["/workshops/web/../python/index.html", "/workshops/web/%2e%2e/index.html", "/workshops/web/%252e%252e/index.html", "/workshops/web/%5cfile.js", "/workshops/web/%00x.js", "/.env", "/workshops/web/.git/config"]:
            with self.subTest(path=path), self.assertRaises((ValueError, FileNotFoundError)):
                server.resource_path(path, self.sources)

    def test_no_directory_listing_or_documents(self):
        for path in ["/workshops/web/tests/browser-checks.js", "/workshops/web/README.md", "/workshops/python/serve.py", "/workshops/web/assets/", "/serve.py", "/workshops.json", "/project/состояние.md", "/workshops/missing/"]:
            with self.subTest(path=path), self.assertRaises((ValueError, FileNotFoundError)):
                server.resource_path(path, self.sources)

    def test_symlink_escape(self):
        with tempfile.TemporaryDirectory(prefix="education-path-") as directory:
            base = Path(directory)
            course = base / "course"
            course.mkdir()
            outside = base / "outside.js"
            outside.write_text("test only")
            (course / "escape.js").symlink_to(outside)
            with self.assertRaises(ValueError):
                server.resource_path("/workshops/demo/escape.js", {"demo": course})

    def test_duplicate_id_and_key(self):
        for field in ["id", "progress"]:
            value = copy.deepcopy(self.raw)
            value["workshops"][1][field] = value["workshops"][0][field]
            with self.subTest(field=field), self.assertRaises(ValueError):
                self.load(value)

    def test_invalid_metadata(self):
        for field, invalid in [("accent", "unknown"), ("lessonCount", True), ("id", "../outside"), ("title", ""), ("topics", [])]:
            value = copy.deepcopy(self.raw)
            value["workshops"][0][field] = invalid
            with self.subTest(field=field), self.assertRaises(ValueError):
                self.load(value)

    def test_source_outside_applications(self):
        value = copy.deepcopy(self.raw)
        value["workshops"][0]["source"] = "../../../"
        with self.assertRaises(ValueError):
            self.load(value)

    def test_bad_progress_and_unknown_route(self):
        for mutate in [lambda v: v["workshops"][0]["progress"].update(lessonIds=["x"]), lambda v: v["paths"][0].update(workshops=["missing"])]:
            value = copy.deepcopy(self.raw)
            mutate(value)
            with self.assertRaises(ValueError):
                self.load(value)

    def test_add_workshop_only_by_registry(self):
        value = copy.deepcopy(self.raw)
        entry = copy.deepcopy(value["workshops"][0])
        entry.update(id="new", title="Новая мастерская", source="tests/fixtures/new-workshop", lessonCount=1, progress=None)
        value["workshops"].append(entry)
        public, sources = self.load(value)
        self.assertEqual(len(public["workshops"]), 8)
        page = server.resource_path("/workshops/new/", sources)
        self.assertIn("Новая мастерская из реестра", page.read_text())
        self.assertEqual(public["workshops"][-1]["url"], "/workshops/new/")


if __name__ == "__main__":
    unittest.main()
