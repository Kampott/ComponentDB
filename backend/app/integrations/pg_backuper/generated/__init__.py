from pathlib import Path
import sys

_GENERATED_DIR = Path(__file__).resolve().parent
_generated_dir_str = str(_GENERATED_DIR)

if _generated_dir_str not in sys.path:
    sys.path.insert(0, _generated_dir_str)
