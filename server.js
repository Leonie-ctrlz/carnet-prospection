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
    },
    {
        name: "remplir_fiche",
        description: "Enregistre la fiche contact extraite de l'offre. À appeler une seule fois, à la fin.",
        input_schema: {
            type: "object",
            properties: {
                entreprise: { type: "string", description: "Nom de l'entreprise qui recrute" },
                ville: { type: "string", description: "Ville du poste" },
                recruteur: { type: "string", description: "Nom de la personne à contacter, vide si absent" },
                email: { type: "string", description: "E-mail de contact, vide si absent" },
                telephone: { type: "string", description: "Téléphone, vide si absent" },
                linkedin: { type: "string", description: "URL LinkedIn du recruteur, vide si absent" },
                siteCarriere: { type: "string", description: "URL de l'offre ou de la page carrière" }
            },
            required: ["entreprise", "ville"]
        }
    }
];

const CONSIGNES = `Tu aides une étudiante à remplir son carnet de prospection d'alternance.
1. Lis l'offre avec l'outil lire_page.
2. Appelle ensuite remplir_fiche avec les informations trouvées.
N'invente jamais une information absente de la page : laisse le champ vide.
Si la page est illisible, appelle quand même remplir_fiche avec ce que tu sais.`;

// 2. Le vrai code de l'outil, exécuté par TON serveur
async function lirePage(url) {
    const reponse = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
            "Accept-Language": "fr-FR,fr;q=0.9"
        }
    });
    console.log(`  ← statut ${reponse.status}`);

    if (!reponse.ok) return `Erreur : la page a répondu ${reponse.status}`;

    const html = await reponse.text();
    const texte = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    console.log(`  ← ${texte.length} caractères récupérés`);
    return texte.slice(0, 15000);
}

async function executerOutil(nom, parametres) {
    if (nom === "lire_page") return await lirePage(parametres.url);
    return `Outil inconnu : ${nom}`;
}

// 3. La boucle de l'agent
// 3. La boucle de l'agent
app.post("/api/agent", async (req, res) => {
    try {
        const { url } = req.body;
        const messages = [
            { role: "user", content: `Voici le lien de l'offre : ${url}` }
        ];

        for (let tour = 1; tour <= 5; tour++) {
            const reponse = await client.messages.create({
                model: "claude-haiku-5-5",
                max_tokens: 1000,
                system: CONSIGNES,
                tools: outils,
                messages
            });

            console.log(`Tour ${tour} : stop_reason = ${reponse.stop_reason}`);
            messages.push({ role: "assistant", content: reponse.content });

            if (reponse.stop_reason !== "tool_use") {
                return res.status(500).json({ erreur: "L'agent s'est arrêté sans remplir la fiche." });
            }

            const resultats = [];
            for (const bloc of reponse.content) {
                if (bloc.type !== "tool_use") continue;
                console.log(`  → ${bloc.name}(${JSON.stringify(bloc.input)})`);

                // La fiche est prête : on la renvoie au navigateur, fin de l'agent
                if (bloc.name === "remplir_fiche") {
                    const fiche = { ...bloc.input };
                    if (!fiche.siteCarriere) fiche.siteCarriere = url;
                    return res.json({ fiche });
                }

                let contenu;
                try {
                    contenu = await executerOutil(bloc.name, bloc.input);
                } catch (err) {
                    contenu = `Erreur : ${err.message}`;
                }
                resultats.push({ type: "tool_result", tool_use_id: bloc.id, content: contenu });
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