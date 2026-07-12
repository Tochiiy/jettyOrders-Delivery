import express from "express"
import cors from "cors"
import dotenv from "dotenv"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5004

app.use(cors())
app.use(express.json())

app.get("/", (_req, res) => {
  res.send("Rider service is running")
})

app.listen(PORT, () => {
  console.log(`Rider service running on port ${PORT}`)
})
