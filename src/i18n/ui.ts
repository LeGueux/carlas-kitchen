import type { Locale } from '../config/locales';
const en = {
  notebook: 'A personal recipe notebook', hero: 'Good food.\nWorth keeping.', intro: 'Recipes to come back to. A few kitchen notes. And always room for something new.',
  recipes: 'The recipe collection', all: 'All recipes', search: 'Search by title', searchHint: 'Something good to cook…', category: 'Category', filter: 'Find a recipe', clear: 'Clear filters',
  empty: 'A fresh page in the notebook.', emptyBody: 'No recipes match just yet. Try another title or category.', noPhoto: 'A photo will go here',
  example: 'Fictional example', exampleBody: 'This is a demonstration recipe with placeholder artwork. The rating and notes are examples, not Carla’s own.',
  back: 'Back to the notebook', prep: 'Preparation', cook: 'Cooking', servings: 'Servings', minutes: 'min', ingredients: 'What you’ll need', steps: 'Let’s make it', notes: 'Kitchen notes', rating: 'Personal rating', lastCooked: 'Last cooked', source: 'View the original source',
  languages: 'Choose a language', unavailable: 'unavailable', missing: 'This recipe is not published in this language. Choose another recipe below or return to an available language.',
  manage: 'Manage recipes', footer: 'A little notebook of good things.', skip: 'Skip to recipes', count: 'recipes', notFound: 'This page has slipped out of the notebook.', notFoundBody: 'The recipe may have moved, or it may still be a draft.', home: 'Open the notebook', preview: 'Private preview — unpublished changes',
};
type Copy = { [K in keyof typeof en]: string };
export const ui: Record<Locale, Copy> = {
  en,
  fr: {
    notebook: 'Un carnet personnel de recettes', hero: 'Les bons plats.\nÀ garder près de soi.', intro: 'Des recettes à retrouver. Quelques notes de cuisine. Et toujours une place pour une nouvelle idée.',
    recipes: 'Les recettes du carnet', all: 'Toutes les recettes', search: 'Rechercher par titre', searchHint: 'Une envie de cuisiner…', category: 'Catégorie', filter: 'Trouver une recette', clear: 'Effacer les filtres',
    empty: 'Une page encore toute fraîche.', emptyBody: 'Aucune recette ne correspond pour le moment. Essayez un autre titre ou une autre catégorie.', noPhoto: 'Une photo trouvera sa place ici',
    example: 'Exemple fictif', exampleBody: 'Cette recette de démonstration utilise une illustration de remplacement. La note et les commentaires sont des exemples, pas ceux de Carla.',
    back: 'Retour au carnet', prep: 'Préparation', cook: 'Cuisson', servings: 'Portions', minutes: 'min', ingredients: 'Ce qu’il vous faut', steps: 'En cuisine', notes: 'Notes de cuisine', rating: 'Note personnelle', lastCooked: 'Dernière préparation', source: 'Consulter la source originale',
    languages: 'Choisir une langue', unavailable: 'indisponible', missing: 'Cette recette n’est pas publiée dans cette langue. Choisissez une autre recette ci-dessous ou revenez à une langue disponible.',
    manage: 'Gérer les recettes', footer: 'Un petit carnet de bonnes choses.', skip: 'Aller aux recettes', count: 'recettes', notFound: 'Cette page s’est échappée du carnet.', notFoundBody: 'La recette a peut-être changé d’adresse, ou elle est encore au brouillon.', home: 'Ouvrir le carnet', preview: 'Aperçu privé — modifications non publiées',
  },
  'pt-PT': {
    notebook: 'Um caderno pessoal de receitas', hero: 'Boa comida.\nPara guardar.', intro: 'Receitas a que apetece voltar. Algumas notas de cozinha. E sempre espaço para uma nova ideia.',
    recipes: 'As receitas do caderno', all: 'Todas as receitas', search: 'Pesquisar pelo título', searchHint: 'Algo bom para cozinhar…', category: 'Categoria', filter: 'Encontrar uma receita', clear: 'Limpar os filtros',
    empty: 'Uma página ainda em branco.', emptyBody: 'Ainda não há receitas com estes critérios. Experimente outro título ou outra categoria.', noPhoto: 'Uma fotografia terá aqui o seu lugar',
    example: 'Exemplo fictício', exampleBody: 'Esta receita de demonstração usa uma ilustração de exemplo. A classificação e as notas são fictícias, não são da Carla.',
    back: 'Voltar ao caderno', prep: 'Preparação', cook: 'Cozedura', servings: 'Doses', minutes: 'min', ingredients: 'O que vai precisar', steps: 'Vamos cozinhar', notes: 'Notas de cozinha', rating: 'Classificação pessoal', lastCooked: 'Última vez que foi preparada', source: 'Ver a fonte original',
    languages: 'Escolher o idioma', unavailable: 'indisponível', missing: 'Esta receita não está publicada neste idioma. Escolha outra receita abaixo ou volte a um idioma disponível.',
    manage: 'Gerir receitas', footer: 'Um pequeno caderno de coisas boas.', skip: 'Ir para as receitas', count: 'receitas', notFound: 'Esta página escapou do caderno.', notFoundBody: 'A receita pode ter mudado de endereço ou ainda ser um rascunho.', home: 'Abrir o caderno', preview: 'Pré-visualização privada — alterações não publicadas',
  },
};
