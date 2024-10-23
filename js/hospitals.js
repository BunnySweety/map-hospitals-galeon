const hospitals = [
    {
        name: "Centre Hospitalier de Châlon-sur-Saône",
        lat: 46.7795,
        lon: 4.8527,
        status: "Deployed",
        address: "4 Rue Capitaine Drillien, 71100 Chalon-sur-Saône, France",
        website: "http://www.ch-chalon71.fr",
        imageUrl: "https://i.ibb.co/HYs7nHY/b-timent-moderne-dh-pital.webp"
    },
    {
        name: "Centre Hospitalier de Toulon",
        lat: 43.1242,
        lon: 5.928,
        status: "Deployed",
        address: "Avenue du 1er Bataillon des Fusiliers Marins, 83000 Toulon, France",
        website: "http://www.ch-toulon.fr",
        imageUrl: "https://i.ibb.co/HYs7nHY/b-timent-moderne-dh-pital.webp"
    },
    {
        name: "Centre Hospitalier de Hyères",
        lat: 43.1175,
        lon: 6.1284,
        status: "Deployed",
        address: "3 Avenue du Dr Jean-Jacques Perron, 83400 Hyères, France",
        website: "http://www.ch-hyeres.fr",
        imageUrl: "https://i.ibb.co/HYs7nHY/b-timent-moderne-dh-pital.webp"
    },
    {
        name: "Centre Hospitalier Universitaire de Caen Normandie",
        lat: 49.1829,
        lon: -0.3707,
        status: "Deployed",
        address: "Avenue de la Côte de Nacre, 14033 Caen, France",
        website: "http://www.chu-caen.fr",
        imageUrl: "https://i.ibb.co/HYs7nHY/b-timent-moderne-dh-pital.webp"
    },
    {
        name: "Centre Hospitalier Sud Francilien, Corbeil-Essonnes",
        lat: 48.6139,
        lon: 2.4749,
        status: "Deployed",
        address: "40 Avenue Serge Dassault, 91100 Corbeil-Essonnes, France",
        website: "http://www.chsf.fr",
        imageUrl: "https://i.ibb.co/HYs7nHY/b-timent-moderne-dh-pital.webp"
    },
    {
        name: "Groupe Hospitalier Nord-Essonne, Longjumeau",
        lat: 48.6953,
        lon: 2.2999,
        status: "Deployed",
        address: "159 Rue du Président François Mitterrand, 91160 Longjumeau, France",
        website: "http://www.ch-nord-essonne.fr",
        imageUrl: "https://i.ibb.co/HYs7nHY/b-timent-moderne-dh-pital.webp"
    },
    {
        name: "Groupe Hospitalier Nord-Essonne, Orsay",
        lat: 48.697,
        lon: 2.1873,
        status: "Deployed",
        address: "4 Place du Général Leclerc, 91400 Orsay, France",
        website: "http://www.ch-nord-essonne.fr",
        imageUrl: "https://i.ibb.co/HYs7nHY/b-timent-moderne-dh-pital.webp"
    },
    {
        name: "Centre Hospitalier Jean Leclaire Sarlat, Sarlat-la-Canéda",
        lat: 44.8904,
        lon: 1.2161,
        status: "Deployed",
        address: "13 Avenue de la Gare, 24200 Sarlat-la-Canéda, France",
        website: "http://www.ch-sarlat.fr",
        imageUrl: "https://i.ibb.co/HYs7nHY/b-timent-moderne-dh-pital.webp"
    },
    {
        name: "Centre Hospitalier Samuel Pozzi, Bergerac",
        lat: 44.8532,
        lon: 0.4845,
        status: "Deployed",
        address: "21 Rue du Professeur Pozzi, 24100 Bergerac, France",
        website: "http://www.ch-bergerac.fr",
        imageUrl: "https://i.ibb.co/HYs7nHY/b-timent-moderne-dh-pital.webp"
    },
    {
        name: "Centre Hospitalier de Périgueux",
        lat: 45.1853,
        lon: 0.7186,
        status: "Deployed",
        address: "80 Avenue Georges Pompidou, 24000 Périgueux, France",
        website: "http://www.ch-perigueux.fr",
        imageUrl: "https://i.ibb.co/HYs7nHY/b-timent-moderne-dh-pital.webp"
    },
    {
        name: "Les Bluets, Paris",
        lat: 48.8499,
        lon: 2.3912,
        status: "Deployed",
        address: "4 Rue Lasson, 75012 Paris, France",
        website: "http://www.lesbluets.fr",
        imageUrl: "https://i.ibb.co/HYs7nHY/b-timent-moderne-dh-pital.webp"
    },
    {
        name: "Centre Hospitalier Universitaire de Rouen Normandie",
        lat: 49.4432,
        lon: 1.0993,
        status: "Signed",
        address: "1 Rue de Germont, 76000 Rouen, France",
        website: "http://www.chu-rouen.fr",
        imageUrl: "https://i.ibb.co/HYs7nHY/b-timent-moderne-dh-pital.webp"
    },
    {
        name: "Centre Hospitalier d'Arpajon",
        lat: 48.5913,
        lon: 2.2423,
        status: "Signed",
        address: "18 Avenue Paul Vaillant Couturier, 91290 Arpajon, France",
        website: "http://www.ch-arpajon.fr",
        imageUrl: "https://i.ibb.co/HYs7nHY/b-timent-moderne-dh-pital.webp"
    },
    {
        name: "Hôpital Sainte-Foy-la-Grande",
        lat: 44.8441,
        lon: 0.2091,
        status: "Signed",
        address: "18 Rue Chanzy, 33220 Sainte-Foy-la-Grande, France",
        website: "http://www.hopital-saintefoylagrande.fr",
        imageUrl: "https://i.ibb.co/HYs7nHY/b-timent-moderne-dh-pital.webp"
    },
    {
        name: "Centre Hospitalier de Montceau",
        lat: 46.6756,
        lon: 4.3663,
        status: "Signed",
        address: "Boulevard du Bois du Verne, 71300 Montceau-les-Mines, France",
        website: "http://www.ch-montceau.fr",
        imageUrl: "https://i.ibb.co/HYs7nHY/b-timent-moderne-dh-pital.webp"        
    }
];