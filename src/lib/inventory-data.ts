export type MovementType = "in" | "out";

export interface Movement {
  id: string;
  type: MovementType;
  quantity: number;
  at: string; // ISO
  user: string;
}

export interface Item {
  id: string;
  name: string;
  sku: string;
  location: string;
  base: number;
  current: number;
  movements: Movement[];
}

const now = Date.now();
const d = (hoursAgo: number) => new Date(now - hoursAgo * 3600 * 1000).toISOString();

export const mockItems: Item[] = [
  {
    id: "ard-uno",
    name: "Arduino UNO R3",
    sku: "ARD-UNO-R3",
    location: "A1",
    base: 30,
    current: 22,
    movements: [
      { id: "m1", type: "out", quantity: 4, at: d(2), user: "Marina Lopes" },
      { id: "m2", type: "out", quantity: 4, at: d(20), user: "Diego Souza" },
      { id: "m3", type: "in", quantity: 10, at: d(72), user: "Estoque Lab" },
      { id: "m4", type: "out", quantity: 10, at: d(120), user: "Marina Lopes" },
    ],
  },
  {
    id: "rpi-5",
    name: "Raspberry Pi 5 (8GB)",
    sku: "RPI5-8GB",
    location: "A2",
    base: 15,
    current: 9,
    movements: [
      { id: "m1", type: "out", quantity: 2, at: d(5), user: "Equipe Robótica" },
      { id: "m2", type: "out", quantity: 4, at: d(48), user: "Diego Souza" },
      { id: "m3", type: "in", quantity: 5, at: d(96), user: "Estoque Lab" },
    ],
  },
  {
    id: "vr-quest",
    name: "Óculos VR Meta Quest 3",
    sku: "VR-QST3",
    location: "B1",
    base: 8,
    current: 5,
    movements: [
      { id: "m1", type: "out", quantity: 1, at: d(3), user: "Camila Rocha" },
      { id: "m2", type: "out", quantity: 2, at: d(50), user: "Workshop XR" },
      { id: "m3", type: "in", quantity: 3, at: d(200), user: "Estoque Lab" },
    ],
  },
  {
    id: "nb-dell",
    name: "Notebook Dell Latitude",
    sku: "NB-DELL-LAT",
    location: "B4",
    base: 12,
    current: 7,
    movements: [
      { id: "m1", type: "out", quantity: 3, at: d(8), user: "RH" },
      { id: "m2", type: "out", quantity: 2, at: d(30), user: "Equipe Dev" },
      { id: "m3", type: "in", quantity: 4, at: d(150), user: "Estoque Lab" },
    ],
  },
  {
    id: "esp-32",
    name: "ESP32 DevKit",
    sku: "ESP32-DEV",
    location: "C2",
    base: 50,
    current: 38,
    movements: [
      { id: "m1", type: "out", quantity: 6, at: d(4), user: "Marina Lopes" },
      { id: "m2", type: "out", quantity: 6, at: d(40), user: "Diego Souza" },
      { id: "m3", type: "in", quantity: 20, at: d(110), user: "Estoque Lab" },
    ],
  },
  {
    id: "3dp-fil",
    name: "Filamento PLA 1kg",
    sku: "FIL-PLA-1K",
    location: "C3",
    base: 40,
    current: 28,
    movements: [
      { id: "m1", type: "out", quantity: 5, at: d(6), user: "Lab Impressão" },
      { id: "m2", type: "out", quantity: 7, at: d(60), user: "Lab Impressão" },
      { id: "m3", type: "in", quantity: 15, at: d(180), user: "Estoque Lab" },
    ],
  },
];

export const totals = (m: Movement[]) => ({
  in: m.filter((x) => x.type === "in").reduce((a, b) => a + b.quantity, 0),
  out: m.filter((x) => x.type === "out").reduce((a, b) => a + b.quantity, 0),
});

export const currentUser = "Você (Operador)";

export function buildItem(name: string, location: string, base: number): Item {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 16) || "ITEM";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    sku: `${slug}-${suffix}`,
    location: location.trim().toUpperCase() || "—",
    base,
    current: base,
    movements:
      base > 0
        ? [
            {
              id: crypto.randomUUID(),
              type: "in",
              quantity: base,
              at: new Date().toISOString(),
              user: currentUser,
            },
          ]
        : [],
  };
}
