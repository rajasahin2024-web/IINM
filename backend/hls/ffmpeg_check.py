"""FFmpeg availability detection — works on Windows and Debian/Linux.

Uses shutil.which() to locate the ffmpeg binary on PATH, and subprocess
to query the version string. No pip dependency required.
"""
import shutil
import subprocess
import logging
import platform


def is_ffmpeg_installed() -> bool:
    """Return True if the ffmpeg binary is available on PATH.

    shutil.which() works cross-platform: on Windows it respects PATHEXT
    (so 'ffmpeg' resolves to 'ffmpeg.exe'), on Linux/macOS it checks PATH.
    """
    return shutil.which("ffmpeg") is not None


def get_ffmpeg_version() -> str | None:
    """Return the first line of `ffmpeg -version`, or None if unavailable."""
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            text=True,
            timeout=5,
            shell=(platform.system() == "Windows"),
        )
        if result.returncode == 0 and result.stdout:
            return result.stdout.split("\n")[0].strip()
    except Exception as e:
        logging.warning(f"FFmpeg version check failed: {e}")
    return None


def get_ffmpeg_install_hint() -> str:
    """Return OS-specific install instructions for FFmpeg."""
    system = platform.system()
    if system == "Windows":
        return (
            "Download from https://ffmpeg.org/download.html#build-windows "
            "and add the bin folder to your PATH, or run: "
            "winget install Gyan.FFmpeg"
        )
    # Debian/Ubuntu and other Linux distros
    return "Run: sudo apt update && sudo apt install -y ffmpeg"


def get_ffmpeg_status() -> dict:
    """Return a combined status dict for the admin UI."""
    installed = is_ffmpeg_installed()
    return {
        "installed": installed,
        "version": get_ffmpeg_version() if installed else None,
        "install_hint": get_ffmpeg_install_hint(),
        "os": platform.system(),
    }
