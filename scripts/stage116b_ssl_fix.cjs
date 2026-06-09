const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const target = path.join(root, "scripts", "run_sachsen_zvg_with_normalizer.py");

if (!fs.existsSync(target)) {
  console.error("Not found:", target);
  process.exit(1);
}

let s = fs.readFileSync(target, "utf8");

// 1) remove SyntaxWarning from docstring by making it raw
s = s.replace('"""\\nSachsen_zvg runner with integrated normalizer.', 'r"""\\nSachsen_zvg runner with integrated normalizer.');

// 2) add SSL options helpers after imports/constants if not exists
if (!s.includes("ZVG_SSL_VERIFY")) {
  const marker = 'GERMAN_MONTHS = {';
  const insert = `
# SSL handling for Windows Python installations where local CA store is broken.
# Default: verify SSL normally.
# Emergency mode:
#   $env:ZVG_SSL_VERIFY="0"
#   python .\\scripts\\run_sachsen_zvg_with_normalizer.py --parser .\\Sachsen_zvg.py --output .\\normalized
ZVG_SSL_VERIFY = os.environ.get("ZVG_SSL_VERIFY", "1").strip().lower() not in {"0", "false", "no", "off"}
`;
  s = s.replace(marker, insert + "\n" + marker);
}

// 3) ensure os is imported
if (!s.includes("import os")) {
  s = s.replace("import argparse\n", "import argparse\nimport os\n");
}

// 4) patch install_and_run to monkey-patch requests inside original parser
if (!s.includes("patch_original_parser_ssl(module)")) {
  const helper = `
def patch_original_parser_ssl(module: Any) -> None:
    """
    Patch original Sachsen_zvg.py requests behavior without modifying the original parser file.

    The original parser uses requests.Session() and request_with_retry(session, ...).
    If Windows Python cannot verify certificates, run with:
      $env:ZVG_SSL_VERIFY="0"

    Normal mode still verifies SSL.
    """
    if not hasattr(module, "requests"):
        return

    try:
        if not ZVG_SSL_VERIFY:
            try:
                module.requests.packages.urllib3.disable_warnings()
            except Exception:
                pass

        original_session_request = module.requests.sessions.Session.request

        def request_with_ssl_default(self, method, url, **kwargs):
            if "verify" not in kwargs:
                kwargs["verify"] = ZVG_SSL_VERIFY
            return original_session_request(self, method, url, **kwargs)

        module.requests.sessions.Session.request = request_with_ssl_default
        print(f"[SSL] requests verify={ZVG_SSL_VERIFY}")
    except Exception as exc:
        print(f"[SSL PATCH WARNING] {exc}", file=sys.stderr)

`;
  s = s.replace("\ndef install_and_run(parser_path: Path, output_root: Path) -> int:\n", "\n" + helper + "\ndef install_and_run(parser_path: Path, output_root: Path) -> int:\n");
  s = s.replace("    spec.loader.exec_module(module)\n\n    original_write_status_file", "    spec.loader.exec_module(module)\n\n    patch_original_parser_ssl(module)\n\n    original_write_status_file");
}

fs.writeFileSync(target, s, "utf8");
console.log("patched", target);
console.log("");
console.log("Use normal verified mode first:");
console.log("  python .\\scripts\\run_sachsen_zvg_with_normalizer.py --parser .\\Sachsen_zvg.py --output .\\normalized");
console.log("");
console.log("If SSL error remains, emergency mode:");
console.log('  $env:ZVG_SSL_VERIFY="0"');
console.log("  python .\\scripts\\run_sachsen_zvg_with_normalizer.py --parser .\\Sachsen_zvg.py --output .\\normalized");
