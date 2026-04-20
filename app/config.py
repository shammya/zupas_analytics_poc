from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    clickhouse_host: str
    clickhouse_port: int = 8443
    clickhouse_user: str = "default"
    clickhouse_password: str
    clickhouse_database: str = "shipday_analytics"

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 10

    auth_username: str
    auth_password_hash: str

    model_config = {"env_file": ".env"}


settings = Settings()
