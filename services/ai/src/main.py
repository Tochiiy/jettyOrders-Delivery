import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agents import suggest_dish_chain, suggest_restaurants_chain, generate_review_chain

app = FastAPI(title="JettyOrders AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SuggestDishRequest(BaseModel):
    restaurant_name: str
    menu_items: list[str]
    user_context: str = ""


class SuggestRestaurantsRequest(BaseModel):
    restaurants: list[dict]
    preferences: str = ""


class GenerateReviewRequest(BaseModel):
    restaurant_name: str
    items: list[str]
    feedback: str = ""


@app.post("/api/ai/suggest-dish")
async def suggest_dish(req: SuggestDishRequest):
    result = await suggest_dish_chain.ainvoke({
        "restaurant_name": req.restaurant_name,
        "menu_items": ", ".join(req.menu_items),
        "user_context": req.user_context or "No specific preference",
    })
    return {"suggestion": result}


@app.post("/api/ai/suggest-restaurants")
async def suggest_restaurants(req: SuggestRestaurantsRequest):
    restaurants_str = "\n".join(
        f"- {r.get('name')} ({r.get('cuisine', 'general')})" for r in req.restaurants
    )
    result = await suggest_restaurants_chain.ainvoke({
        "restaurants": restaurants_str,
        "preferences": req.preferences or "No specific preference",
    })
    return {"suggestion": result}


@app.post("/api/ai/generate-review")
async def generate_review(req: GenerateReviewRequest):
    result = await generate_review_chain.ainvoke({
        "restaurant_name": req.restaurant_name,
        "items": ", ".join(req.items),
        "feedback": req.feedback or "No additional feedback",
    })
    return {"review": result}


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "5003"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
