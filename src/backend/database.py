from os import getenv
from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlmodel import SQLModel, create_engine, Session


PLACEHOLDER_DATABASE_URL_PARTS = (
    "USER",
    "PASSWORD",
    "HOST",
    "PORT",
    "DATABASE",
    "actual_user",
    "actual_password",
    "actual_host",
    "actual_database",
)


def default_database_url() -> str:
    return "sqlite:////tmp/coup.db" if getenv("VERCEL") else "sqlite:///coup.db"


def normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+psycopg://", 1)
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return database_url


def get_database_url(env_var: str = "DATABASE_URL") -> str:
    configured_url = getenv(env_var)
    if not configured_url or any(
        placeholder in configured_url for placeholder in PLACEHOLDER_DATABASE_URL_PARTS
    ):
        return default_database_url()

    return normalize_database_url(configured_url)


database_url = get_database_url()
connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}

engine = create_engine(database_url, connect_args=connect_args)


def create_db_and_tables():
    schema_database_url = get_database_url("DATABASE_URL_UNPOOLED")
    if schema_database_url == default_database_url():
        SQLModel.metadata.create_all(engine)
        return

    schema_engine = create_engine(schema_database_url)
    SQLModel.metadata.create_all(schema_engine)
    schema_engine.dispose()


def check_database() -> None:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))


def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]


def add_to_db(model: SQLModel, session: Session) -> None:
    try:
        session.add(model)
        session.commit()
        session.refresh(model)
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Model already exists in database.",
        )
    except Exception:
        session.rollback()
        raise
