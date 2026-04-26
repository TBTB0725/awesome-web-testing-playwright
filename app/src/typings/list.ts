import type Card from './card';

export default interface List {
  boardId: number;
  name: string;
  id: number;
  order: number;
  created: string;
  cards: Card[];
}
