from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from config import settings

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0.7,
    api_key=settings.groq_api_key,
)

_suggest_dish_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful food recommendation assistant. Suggest 1 dish the user might enjoy based on their context. Respond with just the dish name and a one-sentence reason."),
    ("human", "Restaurant: {restaurant_name}\nMenu: {menu_items}\nUser context: {user_context}"),
])
suggest_dish_chain = _suggest_dish_prompt | llm | StrOutputParser()

_suggest_restaurants_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a restaurant recommendation assistant. Suggest 1-2 restaurants the user might like. Respond with restaurant names and a brief reason for each."),
    ("human", "Available restaurants: {restaurants}\nUser preferences: {preferences}"),
])
suggest_restaurants_chain = _suggest_restaurants_prompt | llm | StrOutputParser()

_generate_review_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a customer who just received a food delivery. Write a short, authentic-sounding review (1-3 sentences) based on the order details provided."),
    ("human", "Restaurant: {restaurant_name}\nItems ordered: {items}\nOptional feedback: {feedback}"),
])
generate_review_chain = _generate_review_prompt | llm | StrOutputParser()
