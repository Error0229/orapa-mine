"""
User and Player models.
"""

from piccolo.columns import Boolean, Integer, Timestamp, Varchar
from piccolo.columns.readable import Readable
from piccolo.table import Table


class User(Table, tablename="users"):
    """
    User account for authentication.
    """

    username = Varchar(length=50, unique=True, index=True)
    email = Varchar(length=255, unique=True, index=True, null=True)
    hashed_password = Varchar(length=255)
    is_active = Boolean(default=True)
    created_at = Timestamp()

    @classmethod
    def get_readable(cls) -> Readable:
        return Readable(template="%s", columns=[cls.username])


class Player(Table, tablename="players"):
    """
    Player profile with game statistics.
    """

    user = Varchar(length=50, unique=True, index=True)  # References User.username
    display_name = Varchar(length=100)
    games_played = Integer(default=0)
    games_won = Integer(default=0)
    total_shots = Integer(default=0)
    successful_guesses = Integer(default=0)
    created_at = Timestamp()
    updated_at = Timestamp()

    @classmethod
    def get_readable(cls) -> Readable:
        return Readable(template="%s", columns=[cls.display_name])
