import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel, Field

from agents import suggest_dish_chain, suggest_restaurants_chain, generate_review_chain
from auth import verify_token
from config import settings

required_vars = {"GROQ_API_KEY": settings.groq_api_key, "JWT_SECRET": settings.jwt_secret}
missing = [k for k, v in required_vars.items() if not v]
if missing:
    raise SystemExit(f"Missing required env vars: {', '.join(missing)}")

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="JettyOrders AI")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SuggestDishRequest(BaseModel):
    restaurant_name: str = Field(alias="restaurantName")
    menu_items: list[str] = Field(alias="menuItems")
    user_context: str = Field(default="", alias="userContext")

    model_config = {"populate_by_name": True}


class SuggestRestaurantsRequest(BaseModel):
    restaurants: list[dict]
    preferences: str = ""


class GenerateReviewRequest(BaseModel):
    restaurant_name: str = Field(alias="restaurantName")
    items: list[str]
    feedback: str = ""

    model_config = {"populate_by_name": True}


@app.post("/api/ai/suggest-dish")
@limiter.limit("10/minute")
async def suggest_dish(request: Request, req: SuggestDishRequest, _user=Depends(verify_token)):
    if len(req.menu_items) > 200:
        return {"suggestion": "Too many menu items provided."}
    menu_str = ", ".join(req.menu_items[:50])
    user_context = (req.user_context or "")[:500]
    result = await suggest_dish_chain.ainvoke({
        "restaurant_name": req.restaurant_name[:200],
        "menu_items": menu_str,
        "user_context": user_context or "No specific preference",
    })
    if len(result) > 3000:
        result = result[:3000]
    return {"suggestion": result}


@app.post("/api/ai/suggest-restaurants")
@limiter.limit("10/minute")
async def suggest_restaurants(request: Request, req: SuggestRestaurantsRequest, _user=Depends(verify_token)):
    restaurants = req.restaurants[:100]
    preferences = (req.preferences or "")[:500]
    restaurants_str = "\n".join(
        f"- {str(r.get('name', ''))[:100]} ({str(r.get('cuisine', 'general'))[:50]})" for r in restaurants
    )
    result = await suggest_restaurants_chain.ainvoke({
        "restaurants": restaurants_str,
        "preferences": preferences or "No specific preference",
    })
    if len(result) > 3000:
        result = result[:3000]
    return {"suggestion": result}


@app.post("/api/ai/generate-review")
@limiter.limit("10/minute")
async def generate_review(request: Request, req: GenerateReviewRequest, _user=Depends(verify_token)):
    items = ", ".join(req.items[:20])
    feedback = (req.feedback or "")[:500]
    result = await generate_review_chain.ainvoke({
        "restaurant_name": req.restaurant_name[:200],
        "items": items,
        "feedback": feedback or "No additional feedback",
    })
    if len(result) > 2000:
        result = result[:2000]
    return {"review": result}


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "5003"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
