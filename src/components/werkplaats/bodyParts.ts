/** Groepen carrosseriedelen voor de opdracht-maker in inname-detail. */
export const BODY_PART_GROUPS: { label: string; parts: string[] }[] = [
  { label: "Voorzijde", parts: ["Voorbumper", "Motorkap", "Grille", "Voorruit"] },
  { label: "Linkerkant", parts: ["L voorscherm", "L voorportier", "L achterportier", "L dorpel", "L achterscherm"] },
  { label: "Rechterkant", parts: ["R voorscherm", "R voorportier", "R achterportier", "R dorpel", "R achterscherm"] },
  { label: "Achterzijde", parts: ["Achterbumper", "Achterklep", "Achterruit"] },
  { label: "Overig", parts: ["Dak", "Velgen", "Interieur", "Anders"] },
];

export const ALL_BODY_PARTS: string[] = BODY_PART_GROUPS.flatMap(g => g.parts);