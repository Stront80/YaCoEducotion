"""Проверки переносимости сборки, состава файлов и сохранности исходников."""
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import build_static


class StaticTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="education-static-")
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.output = self.base / "site"

    def test_all_courses_and_runtime_are_preserved(self):
        public = build_static.build(self.output)
        self.assertEqual(len(public["workshops"]), 7)
        self.assertEqual(sum(w["lessonCount"] for w in public["workshops"]), 133)
        _, sources = build_static.load_registry()
        for workshop in public["workshops"]:
            folder = self.output / workshop["url"]
            self.assertTrue((folder / "index.html").is_file())
            self.assertEqual((folder / "app.js").read_bytes(), (sources[workshop["id"]] / "app.js").read_bytes())
        for name in ["worker.mjs", "harness.py", "vendor/pyodide/pyodide.mjs", "vendor/pyodide/pyodide.asm.mjs", "vendor/pyodide/pyodide.asm.wasm", "vendor/pyodide/python_stdlib.zip", "vendor/PYTHON-LICENSE", "vendor/PYODIDE-LICENSE"]:
            self.assertEqual((self.output / "workshops/python" / name).read_bytes(), (sources["python"] / name).read_bytes())

    def test_static_catalog_has_no_local_sources_or_absolute_routes(self):
        build_static.build(self.output)
        catalog = json.loads((self.output / "workshops-public.json").read_text())
        self.assertNotIn('"source"', json.dumps(catalog))
        for workshop in catalog["workshops"]:
            self.assertEqual(workshop["url"], "./workshops/" + workshop["id"] + "/")
        html = (self.output / "index.html").read_text()
        self.assertIn('data-registry="./workshops-public.json"', html)
        self.assertNotIn('src="/', html)
        self.assertNotIn('href="/', html)

    def test_private_development_files_are_excluded(self):
        build_static.build(self.output)
        files = [p.relative_to(self.output) for p in self.output.rglob("*") if p.is_file()]
        self.assertTrue((self.output / ".nojekyll").is_file())
        for path in files:
            self.assertFalse(set(path.parts) & {"tests", "screenshots", "node_modules", "__pycache__"})
            self.assertNotIn(path.name, {"serve.py", "build_static.py", "workshops.json", ".env", "README.md"})
            if path.suffix == ".py":
                self.assertEqual(path.as_posix(), "workshops/python/harness.py")

    def test_nonempty_output_is_preserved(self):
        self.output.mkdir()
        marker = self.output / "keep.txt"
        marker.write_text("Не перезаписывать")
        with self.assertRaises(ValueError):
            build_static.build(self.output)
        self.assertEqual(marker.read_text(), "Не перезаписывать")
        self.assertEqual(list(self.output.iterdir()), [marker])

    def test_output_inside_sources_and_symlink_are_rejected(self):
        for path in [ROOT, ROOT / "unexpected-output"]:
            with self.assertRaises(ValueError):
                build_static.build(path)
        link = self.base / "link"
        link.symlink_to(ROOT, target_is_directory=True)
        with self.assertRaises(ValueError):
            build_static.build(link)

    def test_escape_symlink_and_hidden_files_never_enter_artifact(self):
        course = self.base / "course"
        course.mkdir()
        (course / "index.html").write_text("<title>Fixture</title>")
        (course / ".hidden.json").write_text("private")
        outside = self.base / "outside.json"
        outside.write_text("outside")
        (course / "escape.json").symlink_to(outside)
        (course / "escape-dir").symlink_to(self.base, target_is_directory=True)
        public = {"workshops": [{"id": "fixture"}]}
        with patch.object(build_static, "load_registry", return_value=(public, {"fixture": course})):
            build_static.build(self.output)
        self.assertEqual([p.name for p in (self.output / "workshops/fixture").iterdir()], ["index.html"])

    def test_repeated_builds_are_identical(self):
        build_static.build(self.output)
        second = self.base / "second"
        build_static.build(second)
        def hashes(folder):
            return {p.relative_to(folder).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
                    for p in folder.rglob("*") if p.is_file()}
        self.assertEqual(hashes(self.output), hashes(second))


if __name__ == "__main__":
    unittest.main()
