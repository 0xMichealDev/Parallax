import importlib.util,unittest,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('patch',ROOT/'scripts/apply-native.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class PatchTests(unittest.TestCase):
 def test_reviewed_camp_hash(self):self.assertEqual(m.digest((ROOT/'baseline/public/camp-experience.js').read_bytes()),m.LOCKS['public/camp-experience.js'][1])
 def test_reviewed_state_hash(self):self.assertEqual(m.digest((ROOT/'baseline/public/rocket-state.js').read_bytes()),m.LOCKS['public/rocket-state.js'][1])
 def test_reviewed_deck_hash(self):self.assertEqual(m.digest((ROOT/'baseline/public/rocket-experience.js').read_bytes()),m.LOCKS['public/rocket-experience.js'][1])
 def test_adapter_replacement(self):self.assertIn('if(i<0)return false;',m.patch_universe(m.OLD_DEPART))
 def test_adapter_ambiguity(self):
  for s in ['',m.OLD_DEPART*2]:
   with self.assertRaises(ValueError):m.patch_universe(s)
 def test_versioning(self):
  html='<head></head>'+''.join(f'<script src="/{n}.js?v=old"></script>' for n in ['rocket-state','rocket-experience','camp-experience','universe'])
  result=m.patch_html(html);self.assertEqual(result.count(m.VERSION),5);self.assertEqual(result.count('observatory-journey.css'),1)
 def test_missing_script_fails(self):
  with self.assertRaises(ValueError):m.patch_html('<head></head>')
 def test_changed_source_writes_nothing(self):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory);(root/'public').mkdir();p=root/'public/rocket-state.js';p.write_text('not the source')
   with self.assertRaises(ValueError):m.build_plan(root)
   self.assertEqual(p.read_text(),'not the source');self.assertFalse((root/'.parallax-journey-backups').exists())
 def test_path_escape_rejected(self):
  with tempfile.TemporaryDirectory() as directory:
   with self.assertRaises(ValueError):m.inside(Path(directory).resolve(),'../elsewhere')
if __name__=='__main__':unittest.main()
