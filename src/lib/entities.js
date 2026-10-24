import { CHARACTER_TEMPLATE, LOCATION_TEMPLATE } from './templates';

// Personagens e cenários têm a mesma estrutura; muda só a tabela e os textos.
export const ENTITY_TYPES = {
  personagens: {
    table: 'characters', fk: 'character_id', title: 'Personagens', singular: 'personagem', novo: 'Novo personagem',
    extra: 'role', extraLabel: 'Papel na história (protagonista, vilão…)', template: CHARACTER_TEMPLATE, round: true,
  },
  cenarios: {
    table: 'locations', fk: 'location_id', title: 'Mapas e cenários', singular: 'cenário', novo: 'Novo cenário',
    extra: 'kind', extraLabel: 'Tipo de local (cidade, casa, dimensão…)', template: LOCATION_TEMPLATE, round: false,
  },
};
