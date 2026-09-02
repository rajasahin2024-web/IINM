"""HLS transcoding via FFmpeg subprocess.

Transcodes a source video into HLS (HTTP Live Streaming) format:
- master.m3u8 (master playlist referencing all renditions)
- <quality>/index.m3u8 (per-rendition playlist)
- <quality>/segment_*.ts (transport stream segments)

No pip dependency — calls the system ffmpeg binary directly.
"""
import os
import subprocess
import logging
from hls.ffmpeg_check import is_ffmpeg_installed

# Quality presets: label -> (resolution, bitrate)
QUALITY_PRESETS: dict[str, tuple[str, str]] = {
    "1080p": ("1920:1080", "5000k"),
    "720p":  ("1280:720",  "2800k"),
    "480p":  ("854:480",   "1200k"),
    "360p":  ("640:360",   "700k"),
    "240p":  ("426:240",   "400k"),
}

DEFAULT_QUALITIES = ["720p", "480p", "360p"]


def transcode_to_hls(
    input_path: str,
    output_dir: str,
    qualities: list[str] | None = None,
) -> str | None:
    """Transcode a video to HLS with multiple quality renditions.

    Args:
        input_path: Path to the source video file (local temp).
        output_dir: Directory where HLS output will be written.
        qualities:  List of quality labels (e.g. ["720p", "480p"]).
                    Defaults to DEFAULT_QUALITIES.

    Returns:
        Path to master.m3u8 on success, None if FFmpeg is missing
        or transcoding fails.
    """
    if not is_ffmpeg_installed():
        logging.warning("FFmpeg not installed — skipping HLS transcoding")
        return None

    qualities = qualities or DEFAULT_QUALITIES
    # Filter to valid presets
    valid = [q for q in qualities if q in QUALITY_PRESETS]
    if not valid:
        logging.warning(f"No valid quality presets in {qualities}, using defaults")
        valid = DEFAULT_QUALITIES

    os.makedirs(output_dir, exist_ok=True)
    master_playlist = os.path.join(output_dir, "master.m3u8")

    # Build FFmpeg command with multiple HLS outputs + master playlist.
    # We use -filter_complex to scale each rendition and -var_stream_map
    # to group them into a single master playlist.
    cmd: list[str] = ["ffmpeg", "-y", "-i", input_path]

    # Add -map and -filter for each quality
    stream_map_parts: list[str] = []
    for idx, q in enumerate(valid):
        res, bitrate = QUALITY_PRESETS[q]
        # scale with -2 to preserve aspect ratio (height fixed).
        # NOTE: do NOT also pass -s:v:idx — combining a scale filter with a
        # forced -s resolution makes FFmpeg emit "Invalid argument" when the
        # filter output dimensions don't exactly match the forced size, which
        # aborts the whole HLS muxer with "Could not write header".
        cmd.extend([
            "-map", "0:v:0",
            "-map", "0:a:0",
            f"-filter:v:{idx}", f"scale=-2:{res.split(':')[1]}",
            f"-b:v:{idx}", bitrate,
            f"-maxrate:v:{idx}", bitrate,
            f"-bufsize:v:{idx}", f"{int(bitrate.rstrip('k')) * 2}k",
        ])
        stream_map_parts.append(f"v:{idx},a:{idx}")

    # HLS encoding settings.
    # IMPORTANT: output paths must be RELATIVE to output_dir. FFmpeg's HLS
    # muxer fails with "Permission denied" on Windows when the %v pattern is
    # combined with an absolute drive-letter path (e.g. C:\...\%v\index.m3u8),
    # because the muxer mangles the drive colon during %v substitution. We
    # therefore run ffmpeg with cwd=output_dir and use bare relative patterns.
    cmd.extend([
        "-c:v", "libx264",
        "-c:a", "aac",
        "-preset", "veryfast",
        "-f", "hls",
        "-hls_time", "6",
        "-hls_list_size", "0",
        # Forward slashes are mandatory here: the variant name is substituted
        # into the master playlist verbatim, and HLS playlists require "/" as
        # the path separator (os.path.join would emit "\" on Windows).
        "-hls_segment_filename", "%v/segment_%03d.ts",
        "-master_pl_name", "master.m3u8",
        "-var_stream_map", " ".join(stream_map_parts),
        "%v/index.m3u8",
    ])

    logging.info(f"Starting HLS transcode: {input_path} -> {output_dir} ({len(valid)} qualities)")
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=1800,  # 30 min max
            cwd=output_dir,
        )
        if result.returncode != 0:
            logging.error(f"FFmpeg HLS transcode failed (exit {result.returncode}): {result.stderr[-2000:]}")
            return None
    except subprocess.TimeoutExpired:
        logging.error("FFmpeg HLS transcode timed out after 30 minutes")
        return None
    except Exception as e:
        logging.error(f"FFmpeg HLS transcode error: {e}")
        return None

    if os.path.exists(master_playlist):
        logging.info(f"HLS transcode complete: {master_playlist}")
        return master_playlist

    logging.error(f"master.m3u8 not found after transcode: {master_playlist}")
    return None
