from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    groq_api_key: str
    jwt_secret: str = "jettyOrders-Delivery37869375"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
