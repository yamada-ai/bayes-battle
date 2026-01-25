// 第4世代のタイプ（17種類、Fairyなし）
export type Type =
  | 'normal'
  | 'fire'
  | 'water'
  | 'electric'
  | 'grass'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon'
  | 'dark'
  | 'steel';

export type MoveCategory = 'physical' | 'special' | 'status';

export type StatusCondition = 'burn' | 'freeze' | 'paralysis' | 'poison' | 'badlyPoisoned' | 'sleep';

export type Stat = 'attack' | 'defense' | 'spAttack' | 'spDefense' | 'speed' | 'accuracy' | 'evasion';

export interface Stats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

export interface StatStages {
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
  accuracy: number;
  evasion: number;
}

export interface Move {
  id: string;
  name: string;
  type: Type;
  category: MoveCategory;
  power: number | null;
  accuracy: number | null;
  priority: number;
  pp: number;
  target: string;
  makesContact: boolean;
}

export interface Pokemon {
  id: number;
  speciesId: string;
  level: number;
  hp: number;
  maxHP: number;
  status: StatusCondition | null;
  stats: Stats;
  statStages: StatStages;
  types: Type[];
  ability: string;
  item: string | null;
  moves: string[];
}

export type Weather = 'sun' | 'rain' | 'sandstorm' | 'hail';
