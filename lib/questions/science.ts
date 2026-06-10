import type { RawQuestion } from "./raw";

export const scienceQuestions: RawQuestion[] = [
  {
    question:
      "Distinguer une opinion d'un savoir scientifique, c'est rappeler que la science :",
    answers: [
      "Est démontrée ou expérimentalement établie, universelle et nécessaire, non un simple avis",
      "Est une opinion partagée par une majorité de chercheurs spécialisés",
      "Repose sur une croyance collective validée par la tradition culturelle",
      "Varie selon les cultures et les époques sans prétendre à l'universalité",
    ],
    correct: 0,
    explanation:
      "Pour Platon déjà, la science (épistémè) se distingue de l'opinion (doxa) : elle sait pourquoi une chose est vraie, et peut en rendre raison.",
  },
  {
    question:
      "Les mathématiques procèdent par démonstration à partir de :",
    answers: [
      "Définitions, axiomes et postulats posés au départ sans exiger de preuve",
      "L'observation répétée de phénomènes naturels vérifiés en laboratoire",
      "Le témoignage fiable de savants reconnus par la communauté scientifique",
      "L'autorité des maîtres transmise de génération en génération",
    ],
    correct: 0,
    explanation:
      "Une science « hypothético-déductive » : on pose des axiomes (admis sans preuve) et on en déduit rigoureusement des théorèmes nécessaires.",
  },
  {
    question:
      "La méthode expérimentale (Claude Bernard) suit l'ordre :",
    answers: [
      "Observation, hypothèse, expérimentation puis vérification du résultat obtenu",
      "Croyance initiale, dogme établi, puis appel à une autorité reconnue",
      "Intuition pure suivie d'une déduction logique sans retour au réel",
      "Déduction abstraite sans recours à aucune observation empirique préalable",
    ],
    correct: 0,
    explanation:
      "Le savant observe un fait, formule une hypothèse pour l'expliquer, puis met en place une expérience qui peut la confirmer ou l'infirmer.",
  },
  {
    question:
      "Pour Karl Popper, ce qui distingue une théorie scientifique d'une pseudo-science est :",
    answers: [
      "La falsifiabilité : la théorie peut être réfutée par une expérience cruciale",
      "Le fait d'être confirmée par tous les résultats disponibles sans exception possible",
      "Sa popularité auprès du grand public et la notoriété de ses défenseurs",
      "Son ancienneté et sa longue tradition d'usage dans la communauté savante",
    ],
    correct: 0,
    explanation:
      "Une théorie est scientifique si elle interdit certains faits (donc si une expérience pourrait la réfuter). Une théorie « qui explique tout » (astrologie) n'est pas scientifique.",
  },
  {
    question:
      "Pour Bachelard, la connaissance scientifique progresse en :",
    answers: [
      "Rompant avec les évidences premières et les « obstacles épistémologiques » du sens commun",
      "Accumulant patiemment les opinions communes et les intuitions populaires vérifiées",
      "Se fiant à la perception immédiate comme point de départ fiable et solide",
      "Refusant toute théorie au profit d'une description neutre des faits observés",
    ],
    correct: 0,
    explanation:
      "« Rien n'est donné, tout est construit » : la science se constitue contre les illusions du sens commun, par rupture et rectification permanentes.",
  },
  {
    question:
      "La distinction entre expliquer et comprendre (Dilthey) oppose :",
    answers: [
      "Les sciences de la nature (expliquer par des causes) et les sciences de l'esprit (comprendre le sens)",
      "Deux manières synonymes de désigner la même démarche intellectuelle rigoureuse",
      "La physique fondamentale et la chimie appliquée dans leurs méthodes respectives",
      "Le vrai savoir démontré et le faux savoir fondé sur de simples apparences trompeuses",
    ],
    correct: 0,
    explanation:
      "On explique un phénomène naturel par ses lois ; on comprend une action humaine en saisissant ses raisons et son sens. D'où la question du statut des sciences humaines.",
  },
  {
    question:
      "Pour Thomas Kuhn, l'histoire des sciences procède par :",
    answers: [
      "Des « révolutions scientifiques » : ruptures de paradigme, non une simple accumulation continue",
      "Une addition progressive et linéaire de vérités qui ne se contredisent jamais entre elles",
      "Le hasard pur des découvertes fortuites réalisées sans intention ni méthode préalable",
      "Un déclin constant compensé par de rares moments de génie individuel exceptionnel",
    ],
    correct: 0,
    explanation:
      "Un paradigme (cadre de référence partagé) domine, puis ses anomalies provoquent une crise et un changement de paradigme (Copernic, Einstein) : la science n'est pas purement cumulative.",
  },
  {
    question:
      "Une loi scientifique énonce :",
    answers: [
      "Un rapport constant et nécessaire entre des phénomènes, permettant de prévoir leurs effets",
      "Une obligation morale s'imposant à tout être raisonnable indépendamment de sa culture",
      "Une décision politique adoptée par une assemblée pour réguler la vie en société",
      "Un fait isolé et singulier dépourvu de portée générale ou de valeur prédictive",
    ],
    correct: 0,
    explanation:
      "La loi physique exprime une régularité universelle (« tous les corps s'attirent ») ; elle permet de prévoir, à la différence de la loi juridique qui prescrit.",
  },
  {
    question:
      "Le caractère « hypothétique » des théories scientifiques signifie que :",
    answers: [
      "Une théorie reste révisable : elle vaut tant qu'elle n'est pas réfutée, sans certitude définitive",
      "La science ne sait rien et n'offre aucune prise fiable sur la réalité du monde",
      "Toutes les théories se valent également, peu importe leur degré de confirmation empirique",
      "Les théories scientifiques, une fois validées, deviennent éternellement vraies et indépassables",
    ],
    correct: 0,
    explanation:
      "La physique de Newton, longtemps tenue pour vraie, a été dépassée par Einstein : une théorie est la meilleure disponible, non une vérité indépassable.",
  },
  {
    question:
      "Le passage de la géométrie d'Euclide aux géométries non euclidiennes montre que :",
    answers: [
      "Les axiomes ne sont pas des vérités évidentes mais des conventions librement choisies et fécondes",
      "Les mathématiques sont fondamentalement fausses et doivent être entièrement refondées",
      "La géométrie est une discipline purement abstraite et inutile pour comprendre le monde réel",
      "Euclide avait systématiquement tort et sa géométrie ne mérite aucune considération sérieuse",
    ],
    correct: 0,
    explanation:
      "En modifiant le postulat des parallèles, on construit d'autres géométries cohérentes : les axiomes sont posés, non lus dans une intuition infaillible.",
  },
  {
    question:
      "La question des limites éthiques de la science (Rabelais) tient dans la formule :",
    answers: [
      "« Science sans conscience n'est que ruine de l'âme »",
      "« La science est toujours bonne et ne peut jamais causer de tort »",
      "« Il faut interdire la science pour préserver la dignité humaine »",
      "« La conscience morale est inutile face à la puissance du progrès »",
    ],
    correct: 0,
    explanation:
      "La puissance du savoir (nucléaire, génétique) pose la question de sa responsabilité : le progrès scientifique n'est pas par lui-même un progrès moral.",
  },
  {
    question:
      "L'idée que les faits scientifiques sont « construits » et non simplement « donnés » signifie :",
    answers: [
      "Qu'un fait scientifique résulte d'instruments, de théories et de mesures, non de la seule perception",
      "Que les faits sont librement inventés par les chercheurs sans contrainte ni contrôle extérieur",
      "Que la réalité extérieure n'existe pas indépendamment de l'esprit qui la perçoit ou l'imagine",
      "Que tout est subjectif et qu'aucune connaissance objective du monde n'est réellement possible",
    ],
    correct: 0,
    explanation:
      "Un « fait » de laboratoire suppose des appareils, un protocole, un cadre théorique qui le rendent pensable et mesurable : il est élaboré, sans être arbitraire.",
  },
  {
    question:
      "La différence entre une science « exacte » et une science « expérimentale » tient à ce que :",
    answers: [
      "La première (mathématiques) démontre a priori ; la seconde (physique) éprouve ses hypothèses dans l'expérience",
      "L'une produit des vérités certaines tandis que l'autre ne génère que des erreurs provisoires",
      "Elles ne diffèrent en rien : toutes deux suivent exactement la même méthode déductive",
      "L'une appartient à l'Antiquité et l'autre est une invention strictement moderne et récente",
    ],
    correct: 0,
    explanation:
      "Les mathématiques raisonnent sur des objets idéaux indépendamment de l'expérience ; la physique confronte ses modèles aux mesures du réel.",
  },
  {
    question:
      "Le scientisme désigne la croyance excessive selon laquelle :",
    answers: [
      "La science peut résoudre toutes les questions, y compris les questions morales et métaphysiques",
      "La science est sans valeur et doit être remplacée par d'autres formes de connaissance",
      "La pratique scientifique doit être strictement interdite au nom de la foi religieuse",
      "Seule la révélation religieuse dit le vrai sur le sens de la vie humaine et du cosmos",
    ],
    correct: 0,
    explanation:
      "Le scientisme érige la science en seule source de vérité et de sens. On peut lui objecter que des questions (le bien, le sens de la vie) excèdent sa compétence.",
  },
  {
    question:
      "La notion d'« obstacle épistémologique » de Bachelard désigne :",
    answers: [
      "Une habitude de pensée ou une évidence sensible qui freine la connaissance scientifique rigoureuse",
      "Un instrument de laboratoire défaillant qui perturbe la précision d'une mesure expérimentale",
      "Une erreur de calcul commise par le chercheur lors d'une démonstration mathématique complexe",
      "Une loi de la nature trop difficile à formuler pour être intégrée dans une théorie cohérente",
    ],
    correct: 0,
    explanation:
      "Nos intuitions premières et images familières (le chaud, le mouvement) doivent être surmontées pour penser scientifiquement : connaître, c'est d'abord déconstruire.",
  },
];
