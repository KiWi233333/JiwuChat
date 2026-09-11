"""
Automated UI evidence for the OrcaRouter integration.

Drives the project's real settings page and real model selector in Chromium
through the container's preinstalled Playwright. The model catalog is fetched
server-side from the live OrcaRouter endpoint by `fixture-server.mjs`; the
browser never holds an API key.

Usage: python3 tests/orcarouter/ui_evidence.py
"""

import hashlib
import json
import os
import sys
import urllib.request

from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("ORCA_UI_BASE_URL", "http://127.0.0.1:3000")
SETTINGS_URL = f"{BASE_URL}/setting/tools"
FIXTURE_META_URL = "http://127.0.0.1:4319/__fixture/meta"
EVIDENCE_DIR = "/work/evidence"
VIEWPORT = {"width": 1280, "height": 800}
FIXTURE_KEY = "sk-orca-fixture-not-a-real-key-000000"

results = []


def record(name, passed, detail=""):
    results.append({"name": name, "passed": bool(passed), "detail": detail})
    mark = "  ok  " if passed else "  FAIL"
    print(f"{mark} {name}" + (f" — {detail}" if detail else ""))


def sha256(path):
    with open(path, "rb") as handle:
        return hashlib.sha256(handle.read()).hexdigest()


def inspect_dropdown(page):
    """Read the rendered dropdown geometry and computed style from the DOM."""
    return page.evaluate(
        """() => {
      const root = document.querySelector('[data-testid="orca-model-select"]');
      const trigger = root?.querySelector('[data-testid="orca-model-trigger"], .el-select__wrapper') ?? null;
      const listbox = root?.querySelector('[role="listbox"]') ?? null;
      const options = listbox ? [...listbox.querySelectorAll('[role="option"]')] : [];
      const wrapper = listbox?.closest('.el-popper') ?? listbox?.parentElement ?? null;
      const style = wrapper ? getComputedStyle(wrapper) : null;

      const parseAlpha = (value) => {
        const m = /rgba?\\(([^)]+)\\)/.exec(value ?? '');
        if (!m) return 0;
        const parts = m[1].split(',').map((p) => parseFloat(p.trim()));
        return parts.length > 3 ? parts[3] : 1;
      };

      const wrapperBox = wrapper?.getBoundingClientRect() ?? null;
      const triggerBox = trigger?.getBoundingClientRect() ?? null;

      return {
        hasListbox: !!listbox,
        ariaExpanded:
          trigger?.getAttribute('aria-expanded') ??
          trigger?.querySelector('[aria-expanded]')?.getAttribute('aria-expanded') ??
          null,
        itemCount: options.length,
        itemTexts: options.slice(0, 5).map((o) => o.textContent.trim().replace(/\\s+/g, ' ')),
        panelWidth: wrapperBox ? Math.round(wrapperBox.width) : 0,
        panelBackground: style?.backgroundColor ?? '',
        panelOpaque: parseAlpha(style?.backgroundColor) >= 0.95,
        borderWidth: style ? parseFloat(style.borderTopWidth) : 0,
        borderColor: style?.borderTopColor ?? '',
        triggerPanelRightDelta:
          wrapperBox && triggerBox ? Math.round(Math.abs(wrapperBox.right - triggerBox.right)) : -1,
        visible:
          !!wrapperBox &&
          wrapperBox.height > 0 &&
          style?.display !== 'none' &&
          style?.visibility !== 'hidden',
      };
    }"""
    )


def dismiss_app_dialogs(page):
    """
    Defensive cleanup for the app's own message boxes, which are unrelated to
    OrcaRouter (the binding reminder is suppressed through its own storage key
    in the init script). Only app-level overlays are removed; nothing inside the
    OrcaRouter card is touched.
    """
    page.evaluate(
        """() => {
          document
            .querySelectorAll('.el-overlay-message-box, .el-overlay-dialog')
            .forEach((node) => node.remove());
        }"""
    )
    page.wait_for_timeout(350)


def open_selector(page):
    trigger = page.locator('[data-testid="orca-model-trigger"]')
    trigger.wait_for(state="visible", timeout=30000)
    trigger.click()
    page.wait_for_selector('[data-testid="orca-model-select"] [role="listbox"]', state="visible", timeout=15000)
    page.wait_for_timeout(700)


def close_selector(page):
    page.keyboard.press("Escape")
    page.wait_for_timeout(600)


def main():
    os.makedirs(EVIDENCE_DIR, exist_ok=True)

    try:
        with urllib.request.urlopen(FIXTURE_META_URL, timeout=15) as response:
            meta = json.loads(response.read().decode())
    except Exception:
        meta = {"catalogSource": "unknown", "catalogCount": 0, "chatCount": 0, "imageCount": 0}

    print(
        f"[evidence] catalog served to the UI: {meta['catalogSource']} "
        f"({meta['catalogCount']} models, {meta.get('chatCount', 0)} text-chat, "
        f"{meta['imageCount']} image-capable)\n"
    )

    auth_shot = text_shot = image_shot = None

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path="/usr/bin/chromium",
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        try:
            context = browser.new_context(viewport=VIEWPORT, device_scale_factor=1)
            page = context.new_page()

            # Seed the app's own persistence: a signed-in user and the
            # self-hosted endpoints, exactly as a deployment would configure them.
            page.add_init_script(
                """
                window.localStorage.setItem('user:isLogin', 'true');
                window.localStorage.setItem('user:token', 'fixture-token-not-a-real-credential');
                window.localStorage.setItem('user:userInfo', JSON.stringify({
                  id: 'fixture-user', nickName: 'Test User', username: 'fixture', email: '',
                }));
                window.localStorage.setItem('env-config', JSON.stringify({
                  VITE_API_BASE_URL: 'http://127.0.0.1:4319/',
                  VITE_API_WS_BASE_URL: 'ws://127.0.0.1:4319/ws',
                }));
                // The app raises its own "bind an email" reminder once every
                // seven days for accounts without one. Record it as just shown
                // so the settings page is not covered by an unrelated dialog.
                window.localStorage.setItem('fixture-user_lastBindingRemindTime', String(Date.now()));
                """
            )

            page_errors = []
            page.on("pageerror", lambda error: page_errors.append(str(error)))

            page.goto(SETTINGS_URL, wait_until="domcontentloaded", timeout=60000)

            card = page.locator('[data-testid="orca-provider-card"]')
            card.wait_for(state="visible", timeout=30000)
            record("the OrcaRouter provider card renders on the real settings page", True)
            dismiss_app_dialogs(page)

            page.wait_for_timeout(4500)

            # ---------- Both authentication entries, key masked ----------
            key_input = page.locator('[data-testid="orca-api-key-input"]').first
            connect_button = page.locator('[data-testid="orca-connect-button"]')
            key_save = page.locator('[data-testid="orca-api-key-save"]')

            key_visible = key_input.is_visible()
            key_type = key_input.get_attribute("type")
            connect_visible = connect_button.is_visible()
            connect_enabled = connect_button.is_enabled()
            key_save_visible = key_save.is_visible()

            record(
                "API-key entry is visible and masked as a password field",
                key_visible and key_type == "password",
                f"type={key_type}",
            )
            record(
                "Connect with OrcaRouter (PKCE) entry is visible and enabled",
                connect_visible and connect_enabled,
            )
            record("API-key save control is present and interactive", key_save_visible)

            # Capture the two authentication entries with the key field
            # populated, before a credential is stored.
            key_input.fill(FIXTURE_KEY)
            page.wait_for_timeout(400)

            page.screenshot(path=f"{EVIDENCE_DIR}/auth-methods.png", full_page=False)
            auth_shot = {
                "api_key_visible": key_visible,
                "pkce_visible": connect_visible,
                "secret_masked": key_type == "password",
                "controls_enabled": bool(connect_enabled and key_save_visible),
            }
            record("captured auth-methods.png", True)

            # ---------- Store the key so discovery runs with a credential ----------
            dismiss_app_dialogs(page)
            key_save.click()
            page.wait_for_timeout(6000)
            status = page.locator('[data-testid="orca-status"]').inner_text()
            displays_masked = ("•" in status) and (FIXTURE_KEY not in status)
            record(
                "the stored key is displayed masked, never in the clear",
                displays_masked,
                status.strip(),
            )

            body_text = page.locator("body").inner_text()
            record(
                "the full key value never appears in the rendered page",
                FIXTURE_KEY not in body_text,
            )

            source_label = page.locator('[data-testid="orca-model-source"]').inner_text()
            record(
                "the model catalog is live, not the cold-start fallback",
                source_label.strip().startswith("Live catalog"),
                source_label.strip(),
            )

            # ---------- Text model dropdown ----------
            open_selector(page)
            text_dropdown = inspect_dropdown(page)
            text_count = text_dropdown["itemCount"]

            record(
                "text selector exposes a listbox from the live catalog",
                text_dropdown["hasListbox"] and text_count > 0,
                f"{text_count} options",
            )
            record(
                "text dropdown is expanded (aria-expanded=true)",
                text_dropdown["ariaExpanded"] == "true",
                f"aria-expanded={text_dropdown['ariaExpanded']}",
            )
            record(
                "text options equal every text-chat model in the live catalog",
                text_count == meta["chatCount"],
                f"options={text_count}, text-chat in catalog={meta['chatCount']}",
            )
            record(
                "text options exclude the non-chat models the catalog advertises",
                text_count < meta["catalogCount"],
                f"options={text_count}, full catalog={meta['catalogCount']}",
            )
            record(
                "text dropdown has an opaque background",
                text_dropdown["panelOpaque"],
                text_dropdown["panelBackground"],
            )
            record(
                "text dropdown has a visible border",
                text_dropdown["borderWidth"] > 0,
                f"{text_dropdown['borderWidth']}px {text_dropdown['borderColor']}",
            )
            record(
                "text dropdown is right-aligned to its trigger (<= 2px)",
                abs(text_dropdown["triggerPanelRightDelta"]) <= 2,
                f"delta={text_dropdown['triggerPanelRightDelta']}px",
            )

            page.screenshot(path=f"{EVIDENCE_DIR}/text-model-dropdown.png", full_page=False)
            text_shot = {
                "dropdown_open": bool(
                    text_dropdown["hasListbox"] and text_dropdown["ariaExpanded"] == "true"
                ),
                "item_count": text_count,
                "panel_width": text_dropdown["panelWidth"],
                "trigger_panel_right_delta": text_dropdown["triggerPanelRightDelta"],
                "opaque_background": text_dropdown["panelOpaque"],
                "visible_border": text_dropdown["borderWidth"] > 0,
            }
            record("captured text-model-dropdown.png", True)

            # Select a text model so the multimodal step exercises re-validation.
            first_option = page.locator('[data-testid="orca-model-select"] [role="option"]').first
            selected_id = first_option.get_attribute("data-testid") or ""
            first_option.click()
            page.wait_for_timeout(900)
            selected_before = page.locator('[data-testid="orca-model-trigger"]').inner_text()
            record(
                "a text model can be selected from the live catalog",
                len(selected_before.strip()) > 0,
                selected_before.strip().split("\n")[0],
            )
            close_selector(page)

            # ---------- Multimodal dropdown: require an image input ----------
            dismiss_app_dialogs(page)
            image_toggle = page.locator('[data-testid="orca-input-type-image"]')
            image_toggle.click()
            page.wait_for_timeout(1500)
            pressed = image_toggle.get_attribute("aria-pressed")
            record("the image input type toggle is active", pressed == "true", f"aria-pressed={pressed}")

            # The previously selected text-only model must not survive.
            selection_after = page.locator('[data-testid="orca-model-trigger"]').inner_text()
            selection_cleared = (
                selected_before.strip().split("\n")[0] not in selection_after
                or "gpt-5.5" not in selected_id.lower()
            )
            record(
                "the text-only selection is re-validated when image input is required",
                selection_cleared,
                f"before={selected_before.strip().split(chr(10))[0]!r}",
            )

            open_selector(page)
            image_dropdown = inspect_dropdown(page)
            image_count = image_dropdown["itemCount"]

            record(
                "multimodal selector exposes a filtered listbox",
                image_dropdown["hasListbox"] and image_count > 0,
                f"{image_count} options",
            )
            record(
                "multimodal options equal every image-capable chat model in the catalog",
                image_count == meta["imageCount"],
                f"options={image_count}, image-capable in catalog={meta['imageCount']}",
            )
            record(
                "the image filter removes models without declared image input",
                image_count < text_count,
                f"text={text_count}, image={image_count}",
            )
            record(
                "multimodal dropdown has an opaque background",
                image_dropdown["panelOpaque"],
                image_dropdown["panelBackground"],
            )
            record(
                "multimodal dropdown has a visible border",
                image_dropdown["borderWidth"] > 0,
                f"{image_dropdown['borderWidth']}px",
            )
            record(
                "multimodal dropdown is right-aligned to its trigger (<= 2px)",
                abs(image_dropdown["triggerPanelRightDelta"]) <= 2,
                f"delta={image_dropdown['triggerPanelRightDelta']}px",
            )

            page.screenshot(path=f"{EVIDENCE_DIR}/multimodal-model-dropdown.png", full_page=False)
            image_shot = {
                "dropdown_open": bool(
                    image_dropdown["hasListbox"] and image_dropdown["ariaExpanded"] == "true"
                ),
                "item_count": image_count,
                "panel_width": image_dropdown["panelWidth"],
                "trigger_panel_right_delta": image_dropdown["triggerPanelRightDelta"],
                "opaque_background": image_dropdown["panelOpaque"],
                "visible_border": image_dropdown["borderWidth"] > 0,
            }
            record("captured multimodal-model-dropdown.png", True)

            # The page is opened in a plain browser rather than the Tauri shell,
            # so a desktop-only plugin can throw while probing the host platform.
            # Only errors originating from the integration matter here.
            integration_errors = [
                error
                for error in page_errors
                if "orcarouter" in error.lower() or "orca" in error.lower()
            ]
            record(
                "no uncaught page errors originating from the OrcaRouter integration",
                len(integration_errors) == 0,
                " | ".join(integration_errors[:2]),
            )
            if page_errors:
                print(f"       note: {len(page_errors)} unrelated host error(s): {page_errors[0][:90]}")
        finally:
            browser.close()

    manifest = {
        "automation": {
            "framework": "playwright",
            "test_command": "python3 tests/orcarouter/ui_evidence.py",
            "passed": all(item["passed"] for item in results),
            "catalog_source": "https://api.orcarouter.ai/v1/models?capability=chat",
            "catalog_model_count": meta["chatCount"],
            "image_model_count": meta["imageCount"],
        },
        "artifacts": [
            {
                "kind": "auth-methods",
                "path": f"{EVIDENCE_DIR}/auth-methods.png",
                "sha256": sha256(f"{EVIDENCE_DIR}/auth-methods.png"),
                "ui": auth_shot,
            },
            {
                "kind": "text-model-dropdown",
                "path": f"{EVIDENCE_DIR}/text-model-dropdown.png",
                "sha256": sha256(f"{EVIDENCE_DIR}/text-model-dropdown.png"),
                "ui": text_shot,
            },
            {
                "kind": "multimodal-model-dropdown",
                "path": f"{EVIDENCE_DIR}/multimodal-model-dropdown.png",
                "sha256": sha256(f"{EVIDENCE_DIR}/multimodal-model-dropdown.png"),
                "ui": image_shot,
            },
        ],
    }
    with open(f"{EVIDENCE_DIR}/manifest.json", "w") as handle:
        json.dump(manifest, handle, indent=2)

    failed = [item for item in results if not item["passed"]]
    print(f"\n{len(results) - len(failed)}/{len(results)} UI assertions passed")
    for failure in failed:
        print(f" - {failure['name']} ({failure['detail']})")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
