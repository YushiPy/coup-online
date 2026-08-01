from contextlib import asynccontextmanager
from os import getenv

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

from backend.constants import ASSETS_DIR, DEFAULT_AVATARS_DIR, PAGES_DIR, STATIC_DIR
from backend.database import check_database, create_db_and_tables
from backend.errors import ErrorCode
from backend.routers import routers
from backend.settings import settings


@asynccontextmanager
async def lifespan(_app: FastAPI):
	settings.avatar_upload_dir.mkdir(parents=True, exist_ok=True)
	if not getenv("VERCEL"):
		DEFAULT_AVATARS_DIR.mkdir(parents=True, exist_ok=True)
	try:
		create_db_and_tables()
		_app.state.database_startup_error = None
	except Exception as exc:
		_app.state.database_startup_error = str(exc)
		if not getenv("VERCEL"):
			raise
	yield


app = FastAPI(lifespan=lifespan)


# Include routers (API endpoints). This includes routers/matches.py (REST)
# and routers/websockets.py (the /api/ws/matches/{match_id} lobby socket) —
# the real, DB-backed match/lobby implementation described in contract.md.
# There used to be a second, in-memory, pre-refactor match+websocket system
# defined directly on `app` further down this file (its own `active_matches`
# dict, its own ConnectionManager, `/api/new_match`, `/api/matches/{id}/join`,
# `/api/match/{id}/start`, `/ws/{match_id}/{player_id}`). It predates the
# routers above and talked to backend.engine.match.Match directly with no
# persistence, no auth, and no relation to the lobby/tribunal flow. It's been
# removed: its `/api/matches/{match_id}/join` route collided in name (though
# not in effect, route resolution order meant the router version always won)
# with routers/matches.py's real endpoint, which was actively confusing to
# read. If an in-match (post-lobby) REST/WS surface is needed later, it
# should be built against backend/engine/registry.py's match registry
# instead of resurrecting this.
for router in routers:
	app.include_router(router)


# Mount 'static' directory
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


FIELD_ERROR_CODES: dict[str, ErrorCode] = {
	"username": ErrorCode.USERNAME_INVALID,
	"password": ErrorCode.PASSWORD_TOO_SHORT,
	"password_confirmation": ErrorCode.PASSWORDS_DONT_MATCH,
}


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
	request: Request, exc: RequestValidationError
) -> JSONResponse:
	first_error = exc.errors()[0]
	field = str(first_error["loc"][-1])
	error_code = FIELD_ERROR_CODES.get(field, ErrorCode.UNKNOWN_ERROR)

	return JSONResponse(
		status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
		content={"detail": {"error_code": error_code, "detail": first_error["msg"]}},
	)


@app.get("/")
async def read_root() -> FileResponse:
	"""Serves the root page (index.html)."""
	return FileResponse(PAGES_DIR / "index.html")


@app.get("/lobby")
async def read_lobby() -> FileResponse:
	"""Serves the lobby page. index.html *is* the lobby/access-terminal
	page — there's no separate lobby.html in static/pages/."""
	return FileResponse(PAGES_DIR / "index.html")


@app.get("/game")
async def read_game() -> FileResponse:
	"""Serves the game page."""
	return FileResponse(PAGES_DIR / "game.html")


@app.get("/favicon.ico", include_in_schema=False)
async def favicon() -> FileResponse:
	"""Serves the favicon."""
	return FileResponse(ASSETS_DIR / "img" / "favicon.ico")


@app.get("/favicon.png", include_in_schema=False)
async def favicon_png() -> FileResponse:
	"""Serves the favicon for browsers that request a PNG icon."""
	return FileResponse(ASSETS_DIR / "img" / "favicon.ico")


@app.get("/api/health/db", include_in_schema=False)
async def database_health(request: Request) -> JSONResponse:
	startup_error = getattr(request.app.state, "database_startup_error", None)
	if startup_error:
		return JSONResponse(
			status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
			content={"ok": False, "startup_error": startup_error},
		)

	try:
		check_database()
	except Exception as exc:
		return JSONResponse(
			status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
			content={"ok": False, "error": str(exc)},
		)

	return JSONResponse({"ok": True})


def main() -> None:
	"""Starts the server with uvicorn."""
	uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
	main()
