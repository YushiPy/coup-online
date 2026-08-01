from pathlib import Path
from os import getenv

from backend.constants import ASSETS_DIR


class Settings:
	avatar_upload_dir: Path = (
		Path("/tmp/coup-avatar-uploads")
		if getenv("VERCEL")
		else ASSETS_DIR / "img" / "avatars" / "uploads"
	)


settings = Settings()
