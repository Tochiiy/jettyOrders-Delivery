import re
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableLambda

from config import settings

llm = ChatGroq(
    model="qwen/qwen3.6-27b",
    temperature=0.7,
    api_key=settings.groq_api_key,
)

_strip_think = RunnableLambda(lambda s: re.sub(r"<think>.*?</think>", "", s, flags=re.DOTALL).strip())

_suggest_dish_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a food recommendation assistant. Suggest 1 dish the user might enjoy. Output ONLY the dish name followed by a short reason in one sentence. Do not include thinking or analysis."),
    ("human", "Restaurant: {restaurant_name}\nMenu: {menu_items}\nUser context: {user_context}"),
])
suggest_dish_chain = _suggest_dish_prompt | llm | StrOutputParser() | _strip_think

_suggest_restaurants_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a restaurant recommendation assistant. Suggest 2 restaurants the user might like. Output ONLY the restaurant names with a brief reason each. No thinking or analysis."),
    ("human", "Available restaurants: {restaurants}\nUser preferences: {preferences}"),
])
suggest_restaurants_chain = _suggest_restaurants_prompt | llm | StrOutputParser() | _strip_think

_generate_review_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a customer who just received a food delivery. Write a short review (1-2 sentences). Output ONLY the review text. No thinking or analysis."),
    ("human", "Restaurant: {restaurant_name}\nItems ordered: {items}\nOptional feedback: {feedback}"),
])
generate_review_chain = _generate_review_prompt | llm | StrOutputParser() | _strip_think
