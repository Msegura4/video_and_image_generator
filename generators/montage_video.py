import shutil
import subprocess
import tempfile
import requests
from pathlib import Path
from typing import List, Optional
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from pydantic import BaseModel
from generators.agent import Agent
from utils.video_utils import VideoUtils


class MontageClip(BaseModel):
    url:                  str
    resource_type:        str = "video"
    trim_start:           float = 0.0
    trim_end:             Optional[float] = None
    speed:                float = 1.0
    duration:             Optional[float] = 3.0
    transition_after:     str = "cut"
    transition_duration:  float = 0.5
    zoom:                 float = 1.0
    pan_x_frac:           float = 0.0
    pan_y_frac:           float = 0.0


class MontageExportBody(BaseModel):
    project_id: str
    clips:      List[MontageClip]


class MontageAgent(Agent):
    """Assemblage de clips vidéo avec transitions via FFmpeg."""

    def __init__(self):
        super().__init__()
        self.utils = VideoUtils()

    def process_clip(self, clip: MontageClip, index: int, work_dir: Path) -> Path:
        """Télécharge et prépare un clip (trim, speed, zoom, normalisation)."""
        ext = ".mp4" if clip.resource_type == "video" else Path(clip.url.split("?")[0]).suffix or ".jpg"
        raw_path  = work_dir / f"raw_{index}{ext}"
        proc_path = work_dir / f"clip_{index}.mp4"

        response = requests.get(clip.url, timeout=60)
        response.raise_for_status()
        raw_path.write_bytes(response.content)

        if clip.resource_type == "image":
            self.utils.image_to_clip(str(raw_path), str(proc_path), clip.duration or 3.0)
            return proc_path

        trim_start   = clip.trim_start or 0.0
        duration_flag = []
        if clip.trim_end is not None and clip.trim_end > trim_start:
            duration_flag = ["-to", str(clip.trim_end - trim_start)]

        speed = clip.speed if clip.speed and clip.speed != 1.0 else None
        pts   = f"setpts={round(1.0 / speed, 6)}*PTS," if speed else ""

        zoom = clip.zoom if clip.zoom and clip.zoom > 1.001 else None
        if zoom:
            crop_w    = int(1920 / zoom) & ~1
            crop_h    = int(1080 / zoom) & ~1
            x_center  = (1920 - crop_w) // 2 - round(1920 * clip.pan_x_frac / zoom)
            y_center  = (1080 - crop_h) // 2 - round(1080 * clip.pan_y_frac / zoom)
            x_offset  = max(0, min(x_center, 1920 - crop_w))
            y_offset  = max(0, min(y_center, 1080 - crop_h))
            crop_filter = f"crop={crop_w}:{crop_h}:{x_offset}:{y_offset},"
        else:
            crop_filter = ""

        vf = (
            f"{pts}{crop_filter}"
            "scale=1920:1080:force_original_aspect_ratio=decrease,"
            "pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=24"
        )

        cmd = [
            "ffmpeg", "-ss", str(trim_start), *duration_flag,
            "-i", str(raw_path),
            "-vf", vf,
            "-c:v", "libx264", "-preset", "fast", "-crf", "18",
            "-an", "-y", str(proc_path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            raise RuntimeError(f"Erreur traitement clip {index} : {result.stderr[-500:]}")
        return proc_path

    def assemble(self, clip_paths: List[Path], clips_meta: List[MontageClip], output_path: Path) -> None:
        """Assemble les clips traités avec leurs transitions."""
        if len(clip_paths) == 1:
            shutil.copy(clip_paths[0], output_path)
            return

        current = clip_paths[0]

        for idx in range(1, len(clip_paths)):
            next_clip    = clip_paths[idx]
            transition   = clips_meta[idx - 1].transition_after
            fade_dur     = clips_meta[idx - 1].transition_duration or 0.5
            intermediate = output_path.parent / f"merged_{idx}.mp4"

            if transition == "fade" and fade_dur > 0:
                dur1   = self.utils.get_video_duration(str(current))
                offset = max(0.0, dur1 - fade_dur)
                cmd = [
                    "ffmpeg",
                    "-i", str(current), "-i", str(next_clip),
                    "-filter_complex",
                    f"[0:v][1:v]xfade=transition=fade:duration={fade_dur}:offset={offset}[v]",
                    "-map", "[v]",
                    "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                    "-an", "-y", str(intermediate),
                ]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
                if result.returncode != 0:
                    self.utils.concat_videos([str(current), str(next_clip)], str(intermediate))
            else:
                self.utils.concat_videos([str(current), str(next_clip)], str(intermediate))

            current = intermediate

        shutil.copy(current, output_path)

    def export(self, clips: List[MontageClip]) -> str:
        """Traite et assemble tous les clips. Retourne le chemin de la vidéo finale."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            work_dir   = Path(tmp_dir)
            clip_paths = [self.process_clip(clip, idx, work_dir) for idx, clip in enumerate(clips)]

            output_path = work_dir / "montage_final.mp4"
            self.assemble(clip_paths, clips, output_path)

            final_path = Path("outputs/montage") / output_path.name
            final_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(output_path, final_path)

        return str(final_path)
