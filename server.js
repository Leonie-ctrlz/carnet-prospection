import "dotenv/config";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
const client = new Anthropic();

app.use(express.json());
app.use(express.static("public"));

// 1. La description des outils, envoyée à Claude
const outils = [
    {
        name: "lire_page",
        description: "Récupère le texte d'une page web (offre d'emploi, page carrière...). " +
            "À utiliser pour lire le contenu d'une URL.",
        input_schema: {
            type: "object",
            properties: {
                url: { type: "string", description: "URL complète de la page à lire" }
            },
            required: ["url"]
        }
    }
];

// 2. Le vrai code de l'outil, exécuté par TON serveur
async function lirePage(url) {
    const reponse = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!reponse.ok) return `Erreur : la page a répondu ${reponse.status}`;

    const html = await reponse.text();
    const texte = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return texte.slice(0, 15000);
}

async function executerOutil(nom, parametres) {
    if (nom === "lire_page") return await lirePage(parametres.url);
    return `Outil inconnu : ${nom}`;
}

// 3. La boucle de l'agent
app.post("/api/agent", async (req, res) => {
    try {
        const { url } = req.body;
        const messages = [
            { role: "user", content: `Lis cette offre et résume-la en 3 lignes : entreprise, ville, poste. URL : ${url}` }
        ];

        for (let tour = 1; tour <= 5; tour++) {
            const reponse = await client.messages.create({
                model: "claude-haiku-5-5",
                max_tokens: 1000,
                tools: outils,
                messages
            });

            console.log(`Tour ${tour} : stop_reason = ${reponse.stop_reason}`);
            messages.push({ role: "assistant", content: reponse.content });

            // Claude n'a plus besoin d'outil : c'est sa réponse finale
            if (reponse.stop_reason !== "tool_use") {
                const texte = reponse.content
                    .filter(bloc => bloc.type === "text")
                    .map(bloc => bloc.text)
                    .join("\n");
                return res.json({ texte });
            }

            // Claude veut utiliser un outil : on l'exécute et on lui renvoie le résultat
            const resultats = [];
            for (const bloc of reponse.content) {
                if (bloc.type === "tool_use") {
                    console.log(`  → ${bloc.name}(${JSON.stringify(bloc.input)})`);
                    let contenu;
                    try {
                        contenu = await executerOutil(bloc.name, bloc.input);
                    } catch (err) {
                        contenu = `Erreur : ${err.message}`;
                    }
                    resultats.push({ type: "tool_result", tool_use_id: bloc.id, content: contenu });
                }
            }
            messages.push({ role: "user", content: resultats });
        }

        res.status(500).json({ erreur: "L'agent a dépassé le nombre de tours autorisé." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erreur: err.message });
    }
});

app.listen(3000, () => console.log("Serveur sur http://localhost:3000"));