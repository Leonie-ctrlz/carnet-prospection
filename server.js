import "dotenv/config";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
const client = new Anthropic();

app.use(express.json());
app.use(express.static("public"));

app.post("/api/agent", async (req, res) => {
    try {
        const { url } = req.body;

        const reponse = await client.messages.create({
            model: "claude-haiku-5-5",
            max_tokens: 500,
            messages: [
                { role: "user", content: `Dis bonjour en une phrase et répète cette URL : ${url}` }
            ]
        });

        res.json({ texte: reponse.content[0].text });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: err.message });
    }
});

app.listen(3000, () => console.log("Serveur sur http://localhost:3000"));