# jettyOrders-Delivery

Food delivery platform built with microservices architecture, real-time order notifications via Socket.IO, and AI-powered features.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4
- **Backend**: Express, Mongoose, JWT, Socket.IO
- **Services**: Auth (5000), Restaurant (5001), Utils (5002), AI (5003), Rider (5004), Realtime (5005)
- **Queue**: RabbitMQ (payment events)
- **AI**: Python FastAPI + LangChain + Groq
- **Payment**: Stripe
