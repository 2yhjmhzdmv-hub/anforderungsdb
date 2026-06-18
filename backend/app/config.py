from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = f"postgresql://localhost:5432/anforderungsdb"
    voyage_api_key: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
