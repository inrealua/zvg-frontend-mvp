const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const target = path.join(root, "scripts", "run_sachsen_zvg_with_normalizer.py");

if (!fs.existsSync(target)) {
  console.error("Not found:", target);
  process.exit(1);
}

let s = fs.readFileSync(target, "utf8");

if (!s.includes("STAGE120_NORMALIZER_PATH_FIX")) {
  const patch = String.raw`

# STAGE120_NORMALIZER_PATH_FIX
# normalized(3).json is already good for data quality.
# Remaining issue: image localPath still contains Windows backslashes:
#   import_files\images\001.jpeg
# This patch normalizes all localPath values to POSIX paths before saving:
#   import_files/images/001.jpeg

def stage120_fix_local_paths_deep(value: Any) -> Any:
    if isinstance(value, dict):
        for k, v in list(value.items()):
            if k == "localPath" and isinstance(v, str):
                value[k] = v.replace("\\\\", "/")
            else:
                stage120_fix_local_paths_deep(v)
    elif isinstance(value, list):
        for item in value:
            stage120_fix_local_paths_deep(item)
    return value


_original_normalize_object_folder_stage120 = normalize_object_folder

def normalize_object_folder(obj_dir: Path, output_root: Path) -> dict[str, Any]:
    n = _original_normalize_object_folder_stage120(obj_dir, output_root)
    stage120_fix_local_paths_deep(n)

    out_dir = output_root / obj_dir.name
    save_json(out_dir / "normalized.json", n)
    save_json(out_dir / "quality_report.json", n.get("quality", {}))
    return n

`;

  s = s.replace(/\ndef main\(\) -> int:\n/, patch + "\ndef main() -> int:\n");
}

fs.writeFileSync(target, s, "utf8");
console.log("patched", target);
console.log("");
console.log("Re-run:");
console.log("  python .\\scripts\\run_sachsen_zvg_with_normalizer.py --normalize-existing .\\zvg_data --output .\\normalized");
