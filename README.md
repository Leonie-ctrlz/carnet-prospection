# Carnet de prospection — Alternance
 
Application web pour suivre mes candidatures et contacts recruteurs dans le cadre de ma recherche d'alternance.
 
## Fonctionnalités
 
- Ajout, modification et suppression de contacts (entreprise, ville, recruteur, site carrière, e-mail, téléphone, LinkedIn)
- Suivi par statut : à contacter, contacté, relance à faire, entretien, accepté, refus
- Tri automatique par priorité
- Date de prochaine relance, avec alerte visuelle si elle est dépassée
- Recherche et filtrage par statut
- Import en masse : colle directement des lignes copiées depuis un tableau Excel
- Sauvegarde automatique dans le navigateur (`localStorage`) — aucune donnée envoyée à un serveur

 ## Technologies
 
HTML / CSS / JavaScript vanilla  

## Utilisation en local
 
1. Cloner le dépôt :
```
   git clone https://github.com/Leonie-ctrlz/carnet-prospection.git
```
2. Ouvrir `index.html` dans un navigateur (ou avec l'extension Live Server de VS Code)


## Structure du projet
 
```
├── index.html      # structure de la page
├── style.css       # mise en forme
├── script.js       # logique de l'application
└── .gitignore      # exclut les fichiers de données personnelles (PDF, Excel)
```


## Pistes d'amélioration

- Vue calendrier des relances à venir
