// Listas e modelos de ficha vindos do protótipo (Comic Manager / Gemini), traduzidos para PT-BR.

export const GENRES = [
  'Ação', 'Aventura', 'Comédia', 'Drama', 'Terror', 'Suspense', 'Mistério', 'Romance',
  'Ficção científica', 'Fantasia', 'Policial', 'Crime', 'Thriller psicológico',
  'Thriller político', 'Thriller de espionagem', 'Guerra', 'Histórico', 'Biografia',
  'Faroeste (Western)', 'Pós-apocalíptico', 'Distopia', 'Utopia', 'Cyberpunk', 'Steampunk',
  'Dieselpunk', 'Space Opera', 'Super-herói', 'Artes marciais', 'Sobrenatural', 'Paranormal',
  'Gótico', 'Tragédia', 'Melodrama', 'Slice of Life (Cotidiano)', 'Coming of Age (Amadurecimento)',
  'Esporte', 'Sobrevivência', 'Desastre', 'Jornada/Quest', 'Épico', 'Mitológico', 'Conto de fadas',
  'Fábula', 'Satírico', 'Paródia', 'Humor negro', 'Comédia romântica', 'Comédia dramática', 'Família',
  'Infantil', 'Juvenil', 'Escolar', 'Musical', 'Erótico', 'Noir', 'Hardboiled', 'Jurídico', 'Médico',
  'Militar', 'Road Movie', 'Heist (assalto/roubo)', 'Investigação', 'Realismo mágico', 'Fantasia sombria',
  'Sword and Sorcery', 'Isekai', 'Mecha', 'Kaiju', 'Zumbi', 'Vampiro', 'Monstro', 'Folk Horror',
  'Horror cósmico', 'Horror corporal (Body Horror)', 'Survival Horror', 'Romance histórico',
  'Romance paranormal', 'Romance trágico', 'Drama familiar', 'Drama psicológico', 'Drama político',
  'Drama social', 'Shonen', 'Shojo', 'Seinen', 'Josei', 'Kodomo',
];

export const AGE_RATINGS = ['Livre', '+10', '+12', '+14', '+16', '+18'];

export const CONTENT_TAGS = [
  'Violência', 'Violência extrema', 'Violência gráfica', 'Violência doméstica', 'Violência sexual',
  'Tortura', 'Assassinato', 'Suicídio', 'Automutilação', 'Bullying', 'Ameaças', 'Sequestro',
  'Perseguição (stalking)', 'Abuso físico', 'Abuso psicológico', 'Abuso infantil', 'Maus-tratos a animais',
  'Conteúdo perturbador', 'Terror', 'Horror psicológico', 'Sustos intensos', 'Temas sombrios',
  'Linguagem imprópria', 'Linguagem ofensiva', 'Palavrões', 'Insultos', 'Discurso de ódio',
  'Conteúdo discriminatório', 'Conteúdo racista', 'Conteúdo preconceituoso', 'Nudez', 'Nudez parcial',
  'Nudez frontal', 'Conteúdo sexual', 'Insinuação sexual', 'Atividade sexual', 'Sexo explícito',
  'Fetichismo', 'Prostituição', 'Uso de álcool', 'Uso de tabaco', 'Uso de drogas lícitas',
  'Uso de drogas ilícitas', 'Abuso de substâncias', 'Tráfico de drogas', 'Temas adultos',
  'Temas psicológicos intensos', 'Saúde mental', 'Depressão', 'Ansiedade', 'Luto', 'Morte',
  'Doença grave', 'Temas existenciais', 'Crime', 'Roubo', 'Assalto', 'Corrupção', 'Fraude',
  'Vandalismo', 'Jogos de azar', 'Apostas', 'Conteúdo religioso sensível', 'Ocultismo', 'Ritualismo',
  'Demonologia', 'Sangue', 'Sangue intenso', 'Mutilação', 'Gore', 'Canibalismo',
];

const section = (name, labels) => ({ section: name, items: labels.map(label => ({ label, value: '' })) });

export const CHARACTER_TEMPLATE = [
  section('Dados pessoais', [
    'Nome completo', 'Apelido', 'Origem do apelido / gosta dele?', 'Data de nascimento', 'Local de nascimento',
    'Background étnico', 'Religião', 'Grau de prática religiosa', 'Endereço atual', 'Aluga ou é dono(a)?',
    'Descrição da casa e da região', 'Mora com alguém?', 'Casa/local ideal', 'Carro', 'Animais de estimação',
    'Ocupação atual', 'Satisfação no trabalho', 'Renda', 'Sexualidade', 'Estado civil / parceiros', 'Filhos',
  ]),
  section('Aparência física', [
    'Altura', 'Peso', 'Tipo físico', 'Cor dos olhos', 'Óculos / lentes / aparelho auditivo', 'Tom de pele',
    'Formato do rosto', 'Marcas, cicatrizes, tatuagens', 'Com quem mais se parece', 'Saúde / condições crônicas',
    'Como se veste', 'Joias / acessórios', 'Cuidados pessoais', 'Penteado', 'Textura do cabelo', 'Cor do cabelo',
  ]),
  section('Fala e comunicação', [
    'Ritmo da fala', 'Tom de voz', 'Sotaque / dialeto', 'Palavras habituais / palavrões', 'Vocabulário',
    'Trejeitos', 'Postura', 'Gestos',
  ]),
  section('Rotina e hábitos', [
    'Finanças', 'Hábitos (fumo, bebida, vícios)', 'Rotina da manhã', 'Tarde / trabalho', 'Noite',
    'Sono (insônia, sonhos?)', 'Hobbies / talentos / fraquezas',
  ]),
  section('Família e passado', [
    'Mãe', 'Pai', 'Irmãos e família estendida', 'Cidade natal / infância', 'Escola',
    'Memórias (primeira, mais feliz, mais triste)', 'Eventos marcantes da infância', 'Empregos anteriores / ficha policial',
    'Primeira paixão', 'Doenças, acidentes ou traumas',
  ]),
  section('Relacionamentos', [
    'Como se relaciona com amigos, estranhos, família, autoridade', 'Qualidade mais admirada / maior defeito',
    'Atrações secretas', 'O que mais detesta / mais gosta', 'Pessoa mais importante agora',
    'Maior influência / admira em segredo', 'Quem não entende / é mal julgado por', 'Em quem confia',
  ]),
  section('Mente e crenças', [
    'Questões psicológicas / otimista ou pessimista', 'MBTI', 'Confortável quando / desconfortável quando',
    'Cauteloso, corajoso ou imprudente', 'Valores / morreria por', 'Filosofia de vida / preconceitos',
    'Desejo secreto / maior medo / arrependimentos', 'Maior orgulho / manias / maior segredo',
    'Objetivos de curto e longo prazo', 'O que teme que aconteça / o que protege',
  ]),
  section('Favoritos', ['Comida', 'Bebida', 'Cor', 'Livro / filme / série', 'Música', 'Esporte / lugares', 'Lema', 'Objeto']),
];

export const LOCATION_TEMPLATE = [
  section('Informações básicas', [
    'Tipo de local', 'Apelidos / nomes populares', 'Localização', 'Dimensões', 'População', 'Fundação / idade', 'Proprietário / governante',
  ]),
  section('Descrição geral', ['Resumo', 'Primeira impressão', 'Atmosfera', 'Paleta visual', 'Cheiros', 'Sons']),
  section('Geografia e estrutura', [
    'Terreno', 'Clima', 'Biomas', 'Pontos de referência', 'Divisões internas', 'Rotas principais', 'Entradas e saídas',
  ]),
  section('Arquitetura e aparência', [
    'Estilo arquitetônico', 'Materiais', 'Estado de conservação', 'Elementos visuais marcantes', 'Iluminação', 'Construções importantes',
  ]),
  section('História', ['Origem / lendas locais', 'Eventos históricos e conflitos']),
  section('Sociedade', ['Habitantes', 'Classes sociais', 'Cultura, costumes e tradições', 'Idiomas, religiões e crenças', 'Leis, preconceitos e tensões']),
  section('Poder, economia e segurança', [
    'Governo / autoridades', 'Facções e disputas', 'Renda e comércio', 'Recursos', 'Riqueza geral', 'Segurança', 'Ameaças e locais perigosos',
  ]),
  section('Infraestrutura', ['Moradia, transporte e comunicação', 'Educação e saúde', 'Água, energia e saneamento']),
  section('Personagens e mistérios', ['Habitantes notáveis', 'Autoridades e figuras lendárias', 'Segredos, mistérios e conspirações']),
  section('Potencial narrativo', ['Conflitos e ganchos', 'Cenários recorrentes e ângulos', 'Locais exploráveis e rumores']),
  section('Cronologia', ['Linha do tempo do local']),
];

export const DOC_KINDS = {
  roteiro: 'Roteiro',
  escaleto: 'Escaleto',
  lore: 'Lore',
  beat_sheet: 'Beat sheet',
  sinopse: 'Sinopse / Loglines',
  modelo: 'Modelo',
  anotacao: 'Anotações',
  planilha: 'Planilha',
};

export const STAGES = [
  { id: 'storyboard', label: 'Storyboard', color: '#607d8b' },
  { id: 'lapis', label: 'Lápis', color: '#2196f3' },
  { id: 'arte_final', label: 'Arte-final', color: '#000000' },
  { id: 'cinzas', label: 'Cinzas', color: '#9e9e9e' },
  { id: 'cor', label: 'Cor', color: '#e91e63' },
  { id: 'letreiramento', label: 'Letreiramento', color: '#ffc107' },
];

export const cloneTemplate = t => JSON.parse(JSON.stringify(t));
