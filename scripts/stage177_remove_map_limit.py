from pathlib import Path
import argparse, json, re
from difflib import unified_diff

def find_target(root: Path) -> Path:
    candidates = [
        root/"components"/"PublicPropertiesPage.tsx",
        root/"app"/"components"/"PublicPropertiesPage.tsx",
        root/"src"/"components"/"PublicPropertiesPage.tsx",
    ]
    for p in candidates:
        if p.exists():
            return p
    found = [p for p in root.rglob("PublicPropertiesPage.tsx") if "node_modules" not in p.parts and ".next" not in p.parts]
    if len(found) == 1:
        return found[0]
    if not found:
        raise SystemExit("PublicPropertiesPage.tsx not found")
    raise SystemExit("Multiple targets found:\n" + "\n".join(map(str, found)))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    target = find_target(root)
    original = target.read_text(encoding="utf-8")
    patched = original
    changes = []

    patched, n = re.subn(r'(?m)^\s*take\s*:\s*(?:1000|1_000)\s*,?\s*\r?\n', '', patched)
    if n:
        changes.append({"change":"removed take: 1000","count":n})

    for lim in ("500","1000","1_000"):
        pat = rf'(?P<expr>\b(?:const\s+)?(?:mapProperties|mapMarkers)\s*=\s*[^;\n]+?)\.slice\(\s*0\s*,\s*{lim}\s*\)'
        patched, n = re.subn(pat, r'\g<expr>', patched)
        if n:
            changes.append({"change":f"removed map slice {lim}","count":n})

    outdir = root/"var"/"stage177_remove_map_limit"
    outdir.mkdir(parents=True, exist_ok=True)
    diff = "".join(unified_diff(original.splitlines(True), patched.splitlines(True),
                                fromfile=str(target)+".before", tofile=str(target)+".after"))
    (outdir/"PublicPropertiesPage.diff").write_text(diff, encoding="utf-8")

    report = {"target":str(target),"apply":args.apply,"changed":patched!=original,"changes":changes}
    if patched == original:
        report["status"]="no known limit pattern found"
    elif args.apply:
        backup = target.with_suffix(target.suffix+".stage177.bak")
        if not backup.exists():
            backup.write_text(original, encoding="utf-8")
        target.write_text(patched, encoding="utf-8")
        report["backup"]=str(backup)
        report["status"]="patched"
    else:
        report["status"]="dry-run"

    (outdir/"report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if patched == original:
        raise SystemExit(2)

if __name__ == "__main__":
    main()
