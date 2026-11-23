import express from "express"
import dotenv from "dotenv"
import z from "zod";
import cors from "cors"

dotenv.config()

const app = express()
const port = process.env.BACKEND_PORT 

app.use(express.json())
app.use(cors())

//endpoints ------>>>>>>

app.post("/send", (req, res) => {
    
})

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`)
})