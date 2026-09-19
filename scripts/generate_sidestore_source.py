#!/usr/bin/env python3
"""Generate the SideStore source.json for LOCKED IN 2 (AltStore/SideStore source format)."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

SOURCE_IDENTIFIER = "app.lockedin.v2.sidestore.source"
APP_BUNDLE_IDENTIFIER = "app.lockedin.v2"
APP_NAME = "LOCKED IN 2"
DEVELOPER_NAME = "Dvget"
MIN_OS_VERSION = "16.4"
TINT_COLOR = "FF7A1A"


def build_source(
    *,
    version: str,
    build_version: str,
    latest_base_url: str,
    download_url: str,
    ipa_size: int,
    release_notes: str,
    release_date: str,
) -> dict:
    latest = latest_base_url.rstrip("/")
    notes = release_notes.strip() or f"{APP_NAME} {version} Build {build_version}"
    return {
        "name": APP_NAME,
        "identifier": SOURCE_IDENTIFIER,
        "sourceURL": f"{latest}/source.json",
        "apps": [
            {
                "name": APP_NAME,
                "bundleIdentifier": APP_BUNDLE_IDENTIFIER,
                "developerName": DEVELOPER_NAME,
                "subtitle": "Neue Version von LOCKED IN (Test)",
                "localizedDescription": "LOCKED IN 2: Neuaufbau der App mit React Native. Läuft neben der bisherigen LOCKED IN App.",
                "iconURL": f"{latest}/icon.png",
                "tintColor": TINT_COLOR,
                "versions": [
                    {
                        "version": version,
                        "buildVersion": build_version,
                        "date": release_date,
                        "localizedDescription": notes,
                        "downloadURL": download_url,
                        "size": int(ipa_size),
                        "minOSVersion": MIN_OS_VERSION,
                    }
                ],
            }
        ],
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate SideStore source.json")
    parser.add_argument("--version", required=True)
    parser.add_argument("--build", required=True, dest="build_version")
    parser.add_argument("--latest-base-url", required=True)
    parser.add_argument("--download-url", required=True)
    parser.add_argument("--ipa-size", required=True, type=int)
    parser.add_argument("--release-date", required=True)
    parser.add_argument("--release-notes", default="")
    parser.add_argument("--output", required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source = build_source(
        version=args.version,
        build_version=args.build_version,
        latest_base_url=args.latest_base_url,
        download_url=args.download_url,
        ipa_size=args.ipa_size,
        release_notes=args.release_notes,
        release_date=args.release_date,
    )
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(source, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
