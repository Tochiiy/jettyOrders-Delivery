import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    groq_api_key: str
    jwt_secret: str
    http_proxy: str = ""
    https_proxy: str = ""
    upstash_redis_rest_url: str = ""
    upstash_redis_rest_token: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

if settings.http_proxy:
    os.environ["HTTP_PROXY"] = settings.http_proxy
if settings.https_proxy:
    os.environ["HTTPS_PROXY"] = settings.https_proxy
    os.environ["REQUESTS_CA_BUNDLE"] = ""
