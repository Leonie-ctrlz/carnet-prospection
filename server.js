import express from "express";

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.post("/api/agent", (req, res) => {
    const { url } = req.body;
    res.json({ entreprise: "Test SARL", ville: "Tours", siteCarriere: url });
});

app.listen(3000, () => console.log("Serveur sur http://localhost:3000"));