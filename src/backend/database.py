from os import getenv
from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import SQLModel, create_engine, Session


def default_database_url() -> str:
    return "sqlite:////tmp/coup.db" if getenv("VERCEL") else "sqlite:///coup.db"


def get_database_url() -> str:
    configured_url = getenv("DATABASE_URL")
    if not configured_url or any(
        placeholder in configured_url
        for placeholder in (
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
    ):
        return default_database_url()

    return configured_url


database_url = get_database_url()
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+psycopg://", 1)
elif database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}

engine = create_engine(database_url, connect_args=connect_args)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


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
