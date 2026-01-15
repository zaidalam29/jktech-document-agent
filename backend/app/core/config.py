from pydantic_settings import BaseSettings, SettingsConfigDict
from urllib.parse import quote_plus


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Documents Q&A For JkTech"
    APP_ENV: str = "development"
    DEBUG: bool = True
    USE_S3: bool = False 
    
    # DB
    DB_HOST: str
    DB_PORT: int = 5432
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    
    # LLM OPENROUTER
    LLM_KEY: str
    LLM_MODEL: str = "meta-llama/llama-3-8b-instruct"
    
    # Security
    BASIC_AUTH_USERNAME: str = "admin"
    BASIC_AUTH_PASSWORD: str = "password"
    
    # Local Storage
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024
    ALLOWED_EXTENSIONS: list = [".pdf", ".txt", ".doc", ".docx", ".md", ".json"]
    
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None
    S3_BUCKET_NAME: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    

    @property
    def DATABASE_URL(self) -> str:
        password = quote_plus(self.DB_PASSWORD)
        return (
            f"postgresql+asyncpg://{self.DB_USER}:"
            f"{password}@{self.DB_HOST}:"
            f"{self.DB_PORT}/{self.DB_NAME}"
        )


settings = Settings()

print("🔥 DB HOST:", settings.DB_HOST)
print("🔥 DB URL:", settings.DATABASE_URL)